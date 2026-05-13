import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrendsService } from './trends.service';

const makeOrder = (
  total: number,
  status: OrderStatus = OrderStatus.CONFIRMED,
) => ({
  total,
  orderStatus: status,
});

describe('TrendsService', () => {
  let service: TrendsService;
  let prisma: {
    order: { findMany: jest.Mock };
    customer: { count: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn() },
      customer: { count: jest.fn() },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TrendsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TrendsService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── summary ───

  it('T.1: summary returns 4 cards with correct structure', async () => {
    prisma.order.findMany.mockResolvedValue([makeOrder(100), makeOrder(200)]);
    prisma.customer.count.mockResolvedValue(3);

    const result = await service.summary(1, 'current_month');

    expect(result.period).toBe('current_month');
    expect(result.cards).toHaveProperty('revenue');
    expect(result.cards).toHaveProperty('orders');
    expect(result.cards).toHaveProperty('averageTicket');
    expect(result.cards).toHaveProperty('newCustomers');
    expect(result.from).toBeDefined();
    expect(result.to).toBeDefined();
  });

  it('T.2: summary excludes CANCELED orders from revenue/orders', async () => {
    prisma.order.findMany.mockResolvedValue([
      makeOrder(100, OrderStatus.CONFIRMED),
      makeOrder(50, OrderStatus.CANCELED),
    ]);
    prisma.customer.count.mockResolvedValue(0);

    const result = await service.summary(1, 'current_month');

    expect(result.cards.revenue.current).toBe(100);
    expect(result.cards.orders.current).toBe(1);
  });

  it('T.3: summary with no orders → revenue=0, changePercent=0 (not NaN)', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);

    const result = await service.summary(1, 'current_month');

    expect(result.cards.revenue.current).toBe(0);
    expect(result.cards.revenue.changePercent).toBe(0);
    expect(result.cards.averageTicket.current).toBe(0);
    expect(Number.isNaN(result.cards.revenue.changePercent)).toBe(false);
  });

  it('T.4: summary previous=0 current>0 → changePercent=100 (not Infinity)', async () => {
    // current period has orders, previous has none
    prisma.order.findMany
      .mockResolvedValueOnce([makeOrder(500)]) // current
      .mockResolvedValueOnce([]); // previous
    prisma.customer.count.mockResolvedValue(0);

    const result = await service.summary(1, 'current_month');

    expect(result.cards.revenue.changePercent).toBe(100);
    expect(Number.isFinite(result.cards.revenue.changePercent)).toBe(true);
  });

  it('T.5: summary current_week uses from=this week sunday', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);

    const result = await service.summary(1, 'current_week');
    const from = new Date(result.from);
    expect(from.getDay()).toBe(0); // Sunday
    expect(result.period).toBe('current_week');
  });

  // ─── revenue ───

  it('T.6: revenue last_7d granularity=day returns 7 data points', async () => {
    prisma.$queryRaw.mockResolvedValue([]); // no orders — all zero fill

    const result = await service.revenue(1, 'day', 'last_7d');

    expect(result.data).toHaveLength(7);
    expect(result.granularity).toBe('day');
    expect(result.period).toBe('last_7d');
    result.data.forEach((d) => {
      expect(d.revenue).toBe(0);
      expect(d.orders).toBe(0);
    });
  });

  it('T.7: revenue invalid combination → BadRequestException', async () => {
    await expect(service.revenue(1, 'day', 'last_12m')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('T.8: revenue data points are zero-filled (dates without orders present)', async () => {
    // Only 1 day has data
    const today = new Date();
    const bucket = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    prisma.$queryRaw.mockResolvedValue([
      { bucket, revenue: '150', orders: '3' },
    ]);

    const result = await service.revenue(1, 'day', 'last_7d');

    expect(result.data).toHaveLength(7);
    const total = result.data.reduce((s, d) => s + d.revenue, 0);
    expect(total).toBe(150);
  });

  it('T.9: revenue summary.total and averageDaily correct', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.revenue(1, 'day', 'last_7d');

    expect(result.summary.total).toBe(0);
    expect(result.summary.totalOrders).toBe(0);
    expect(result.summary.averageDaily).toBe(0);
  });

  it('T.10: revenue month granularity with last_12m returns ~12 data points', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.revenue(1, 'month', 'last_12m');

    expect(result.data.length).toBeGreaterThanOrEqual(12);
    expect(result.data.length).toBeLessThanOrEqual(13); // boundary month
    expect(result.granularity).toBe('month');
  });
});
