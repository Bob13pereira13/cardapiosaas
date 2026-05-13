import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ComplementPriceMode,
  ComplementSelectionRule,
  DeliveryType,
  OptionStockStatus,
  PaymentMethod,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryCheckService } from '../delivery-zones/delivery-check.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { TabsService } from '../tabs/tabs.service';
import { OrdersGateway } from './orders.gateway';
import { OrdersService } from './orders.service';
import { AsaasPaymentService } from './asaas-payment.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeComplement(
  overrides: Partial<{
    id: number;
    name: string;
    selectionRule: ComplementSelectionRule;
    priceMode: ComplementPriceMode;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      id: number;
      name: string;
      extraPrice: string;
      stockStatus?: OptionStockStatus;
      isActive?: boolean;
    }>;
  }> = {},
) {
  const opts = overrides.options ?? [
    { id: 10, name: 'Chocolate', extraPrice: '2.00' },
    { id: 11, name: 'Morango', extraPrice: '3.00' },
  ];
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Sabores',
    selectionRule: overrides.selectionRule ?? ComplementSelectionRule.SINGLE,
    priceMode: overrides.priceMode ?? ComplementPriceMode.SUM_OF_SELECTED,
    minSelections: overrides.minSelections ?? 1,
    maxSelections: overrides.maxSelections ?? 1,
    complementOptions: opts.map((o, i) => ({
      id: i + 1,
      complementId: overrides.id ?? 1,
      optionId: o.id,
      extraPrice: new Prisma.Decimal(o.extraPrice),
      isVisible: true,
      sortOrder: i,
      option: {
        id: o.id,
        name: o.name,
        stockStatus: o.stockStatus ?? OptionStockStatus.ACTIVE,
        isActive: o.isActive ?? true,
      },
    })),
  };
}

function makeProduct(
  complementOverrides?: Parameters<typeof makeComplement>[0],
) {
  const complement = makeComplement(complementOverrides);
  return {
    id: 1,
    restaurantId: 10,
    nome: 'Pizza',
    preco: 29.9,
    categoryId: null,
    productComplements: [
      {
        id: 1,
        productId: 1,
        complementId: complement.id,
        sortOrder: 0,
        complement,
      },
    ],
  };
}

const mockRestaurant = {
  id: 10,
  nome: 'Restaurante Teste',
  taxaEntrega: 5,
  subscriptionStatus: SubscriptionStatus.ACTIVE,
  trialEndsAt: null,
};

// ── mock prisma ───────────────────────────────────────────────────────────────

const mockPrisma = {
  restaurant: { findFirst: jest.fn(), update: jest.fn() },
  product: { findMany: jest.fn() },
  order: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  customer: { upsert: jest.fn() },
  coupon: { update: jest.fn() },
  tab: { findFirst: jest.fn(), create: jest.fn() },
  payment: { create: jest.fn(), findFirst: jest.fn() },
  campaignMessage: { findFirst: jest.fn() },
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockCoupons = { validate: jest.fn(), calcDiscount: jest.fn() };
const mockGateway = {
  emitNewOrder: jest.fn(),
  emitStatusChanged: jest.fn(),
  emitWhatsappPrompt: jest.fn(),
  emitPaymentConfirmed: jest.fn(),
};
const mockAsaas = { createPixCharge: jest.fn() };
const mockLoyalty = { awardPoints: jest.fn() };
const mockAudit = { log: jest.fn() };
const mockPromotions = { findActive: jest.fn() };
const mockTabs = { recalculateTotals: jest.fn() };
const mockDelivery = { check: jest.fn() };

// ── helpers for common transaction mocks ────────────────────────────────────

function setupHappyTransaction() {
  mockPrisma.order.findFirst.mockResolvedValue({ orderNumber: 0 });
  mockPrisma.customer.upsert.mockResolvedValue({ id: 99 });
  mockPrisma.tab.create.mockResolvedValue({ id: 55 });
  mockPrisma.order.create.mockResolvedValue({
    id: 1,
    orderNumber: 1,
    total: 34.9,
    couponId: null,
    customerId: 99,
    customerPhone: '11999999999',
    customerName: 'João',
    items: [],
  });
  mockPrisma.payment.create.mockResolvedValue({ id: 1 });
  mockPrisma.$executeRaw.mockResolvedValue(1);
  mockTabs.recalculateTotals.mockResolvedValue({ totalPago: 0, total: 34.9 });
}

// ── test suite ────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.resetAllMocks();

    mockPrisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
      return (arg as (tx: unknown) => Promise<unknown>)(mockPrisma);
    });

    mockPromotions.findActive.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CouponsService, useValue: mockCoupons },
        { provide: OrdersGateway, useValue: mockGateway },
        { provide: AsaasPaymentService, useValue: mockAsaas },
        { provide: LoyaltyService, useValue: mockLoyalty },
        { provide: AuditService, useValue: mockAudit },
        { provide: PromotionsService, useValue: mockPromotions },
        { provide: TabsService, useValue: mockTabs },
        { provide: DeliveryCheckService, useValue: mockDelivery },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── restaurant validation ──────────────────────────────────────────────────

  it('throws 404 when restaurant not found', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(null);
    await expect(
      service.create('unknown-slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 400 when subscription is OVERDUE', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue({
      ...mockRestaurant,
      subscriptionStatus: SubscriptionStatus.OVERDUE,
    });
    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 for DELIVERY without address', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.DELIVERY,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── product validation ─────────────────────────────────────────────────────

  it('throws 400 when product not found or unavailable', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([]); // 0 found, 1 requested

    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 99, quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── complement validation ─────────────────────────────────────────────────

  it('throws 400 when complement not linked to product', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [
          {
            productId: 1,
            quantity: 1,
            selectedComplements: [
              { complementId: 999, selectedOptions: [{ optionId: 10 }] },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when option not part of complement', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [
          {
            productId: 1,
            quantity: 1,
            selectedComplements: [
              { complementId: 1, selectedOptions: [{ optionId: 999 }] },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when SINGLE rule receives more than 1 option', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [
          {
            productId: 1,
            quantity: 1,
            selectedComplements: [
              {
                complementId: 1,
                selectedOptions: [{ optionId: 10 }, { optionId: 11 }],
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when min selections not met (required complement missing)', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    // minSelections=1 but no selectedComplements provided
    mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 1, quantity: 1 }], // no selectedComplements
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when MULTI_NO_REPEAT receives duplicate options', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([
      makeProduct({
        selectionRule: ComplementSelectionRule.MULTI_NO_REPEAT,
        minSelections: 0,
        maxSelections: 2,
      }),
    ]);

    await expect(
      service.create('slug', {
        customerName: 'A',
        customerPhone: '11999999999',
        deliveryType: DeliveryType.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        items: [
          {
            productId: 1,
            quantity: 1,
            selectedComplements: [
              {
                complementId: 1,
                selectedOptions: [{ optionId: 10 }, { optionId: 10 }], // duplicate
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── price calculation ─────────────────────────────────────────────────────

  it('calculates price correctly for SUM_OF_SELECTED', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([
      makeProduct({
        selectionRule: ComplementSelectionRule.MULTI_NO_REPEAT,
        priceMode: ComplementPriceMode.SUM_OF_SELECTED,
        minSelections: 0,
        maxSelections: 2,
      }),
    ]);
    setupHappyTransaction();

    await service.create('slug', {
      customerName: 'João',
      customerPhone: '11999999999',
      deliveryType: DeliveryType.PICKUP,
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: 1,
          quantity: 1,
          selectedComplements: [
            {
              complementId: 1,
              selectedOptions: [{ optionId: 10 }, { optionId: 11 }], // 2+3=5
            },
          ],
        },
      ],
    });

    // baseUnitPrice should be 29.9 + 5 = 34.9
    const createCall = mockPrisma.order.create.mock.calls[0][0];
    expect(createCall.data.subtotal).toBeCloseTo(34.9);
  });

  it('calculates price correctly for HIGHEST_SELECTED', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([
      makeProduct({
        selectionRule: ComplementSelectionRule.MULTI_NO_REPEAT,
        priceMode: ComplementPriceMode.HIGHEST_SELECTED,
        minSelections: 0,
        maxSelections: 2,
      }),
    ]);
    setupHappyTransaction();

    await service.create('slug', {
      customerName: 'João',
      customerPhone: '11999999999',
      deliveryType: DeliveryType.PICKUP,
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: 1,
          quantity: 1,
          selectedComplements: [
            {
              complementId: 1,
              selectedOptions: [{ optionId: 10 }, { optionId: 11 }], // highest=3
            },
          ],
        },
      ],
    });

    // baseUnitPrice should be 29.9 + 3 = 32.9
    const createCall = mockPrisma.order.create.mock.calls[0][0];
    expect(createCall.data.subtotal).toBeCloseTo(32.9);
  });

  // ── snapshot creation ──────────────────────────────────────────────────────

  it('creates order with complement snapshots in transaction', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);
    setupHappyTransaction();

    await service.create('slug', {
      customerName: 'João',
      customerPhone: '11999999999',
      deliveryType: DeliveryType.PICKUP,
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: 1,
          quantity: 1,
          selectedComplements: [
            { complementId: 1, selectedOptions: [{ optionId: 10 }] },
          ],
        },
      ],
    });

    const createCall = mockPrisma.order.create.mock.calls[0][0];
    const itemCreate = createCall.data.items.create[0];
    expect(itemCreate.selectedComplements).toEqual({
      create: [
        expect.objectContaining({
          complementId: 1,
          complementNameSnapshot: 'Sabores',
          selectionRuleSnapshot: ComplementSelectionRule.SINGLE,
          selectedOptions: {
            create: [
              expect.objectContaining({
                optionId: 10,
                optionNameSnapshot: 'Chocolate',
                optionPriceSnapshot: 2,
                quantity: 1,
              }),
            ],
          },
        }),
      ],
    });
  });

  it('creates order without selectedComplements when no complements selected', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);
    // product with no required complements (minSelections=0)
    mockPrisma.product.findMany.mockResolvedValue([
      makeProduct({ minSelections: 0 }),
    ]);
    setupHappyTransaction();

    await service.create('slug', {
      customerName: 'João',
      customerPhone: '11999999999',
      deliveryType: DeliveryType.PICKUP,
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 1, quantity: 1 }], // no selectedComplements
    });

    const createCall = mockPrisma.order.create.mock.calls[0][0];
    const itemCreate = createCall.data.items.create[0];
    expect(itemCreate.selectedComplements).toBeUndefined();
  });

  // ── createManualOrder ─────────────────────────────────────────────────────

  it('creates manual order without complement references', async () => {
    mockPrisma.restaurant.findFirst.mockResolvedValue({
      id: 10,
      taxaEntrega: 5,
    });
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 1, restaurantId: 10, nome: 'Pizza', preco: 29.9, categoryId: null },
    ]);
    setupHappyTransaction();

    await service.createManualOrder(10, {
      customerName: 'João',
      customerPhone: '11999999999',
      deliveryType: DeliveryType.PICKUP,
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 1, quantity: 2 }],
    });

    const createCall = mockPrisma.order.create.mock.calls[0][0];
    const itemCreate = createCall.data.items.create[0];
    expect(itemCreate).not.toHaveProperty('selectedOptions');
    expect(itemCreate.unitPrice).toBe(29.9);
  });
});
