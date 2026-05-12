import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryType,
  OptionPriceMode,
  OrderOrigin,
  OrderStatus,
  PaymentMethod,
  Prisma,
  SubscriptionStatus,
  TabPaymentMethod,
  TabTipo,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrdersGateway } from './orders.gateway';
import { AsaasPaymentService } from './asaas-payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { AuditService } from '../audit/audit.service';
import { PromotionsService } from '../promotions/promotions.service';
import { TabsService } from '../tabs/tabs.service';
import { DeliveryCheckService } from '../delivery-zones/delivery-check.service';

type AsaasOrderWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    externalReference?: string;
    status?: string;
  };
};

const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELED],
  [OrderStatus.IN_PREPARATION]: [OrderStatus.READY, OrderStatus.CANCELED],
  [OrderStatus.READY]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELED],
};

function isPrismaUniqueError(error: unknown): error is { code: 'P2002' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function toTabTipo(deliveryType: DeliveryType): TabTipo {
  if (deliveryType === DeliveryType.DINE_IN) return TabTipo.SALAO;
  if (deliveryType === DeliveryType.DELIVERY) return TabTipo.DELIVERY;
  return TabTipo.RETIRADA;
}

function toTabPaymentMethod(pm: PaymentMethod): TabPaymentMethod {
  switch (pm) {
    case PaymentMethod.CASH:
      return TabPaymentMethod.DINHEIRO;
    case PaymentMethod.PIX:
      return TabPaymentMethod.PIX;
    case PaymentMethod.CREDIT_CARD:
      return TabPaymentMethod.CARTAO_CREDITO;
    case PaymentMethod.DEBIT_CARD:
      return TabPaymentMethod.CARTAO_DEBITO;
    default:
      throw new Error(
        `PaymentMethod '${pm}' não tem mapeamento para TabPaymentMethod`,
      );
  }
}

function getFinancialRange(
  period: 'TODAY' | 'WEEK' | 'MONTH',
  dateFrom?: string,
  dateTo?: string,
) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'WEEK') start.setDate(start.getDate() - 6);
  if (period === 'MONTH') start.setDate(start.getDate() - 29);
  if (dateFrom) {
    const customStart = new Date(dateFrom);
    customStart.setHours(0, 0, 0, 0);
    start.setTime(customStart.getTime());
  }
  const end = dateTo ? new Date(dateTo) : new Date(now);
  if (dateTo) end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
    private gateway: OrdersGateway,
    private asaasPayment: AsaasPaymentService,
    private loyalty: LoyaltyService,
    private audit: AuditService,
    private promotions: PromotionsService,
    private tabsService: TabsService,
    private deliveryCheck: DeliveryCheckService,
  ) {}

  private normalizeHost(host?: string) {
    return host
      ?.split(':')[0]
      ?.trim()
      .toLowerCase()
      .replace(/^www\./, '');
  }

  async create(slug: string, dto: CreateOrderDto, host?: string) {
    const normalizedHost = this.normalizeHost(host);
    const restaurant = await this.prisma.restaurant.findFirst({
      where:
        normalizedHost && slug === 'domain'
          ? { customDomain: normalizedHost }
          : { slug },
      select: {
        id: true,
        nome: true,
        taxaEntrega: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });
    if (!restaurant)
      throw new NotFoundException('Estabelecimento não encontrado.');

    let subscriptionStatus = restaurant.subscriptionStatus;
    if (
      subscriptionStatus === SubscriptionStatus.TRIAL &&
      restaurant.trialEndsAt &&
      restaurant.trialEndsAt.getTime() < Date.now()
    ) {
      subscriptionStatus = SubscriptionStatus.OVERDUE;
      await this.prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { subscriptionStatus },
      });
    }

    if (
      subscriptionStatus === SubscriptionStatus.OVERDUE ||
      subscriptionStatus === SubscriptionStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Este restaurante nÃ£o estÃ¡ recebendo pedidos no momento.',
      );
    }

    if (dto.deliveryType === DeliveryType.DELIVERY && !dto.customerAddress) {
      throw new BadRequestException('Endereço é obrigatório para entrega.');
    }

    const customerDocument = dto.customerDocument?.replace(/\D/g, '');
    if (
      dto.paymentMethod === PaymentMethod.ONLINE_PIX &&
      (!customerDocument ||
        (customerDocument.length !== 11 && customerDocument.length !== 14))
    ) {
      throw new BadRequestException(
        'CPF/CNPJ Ã© obrigatÃ³rio para pagamento Pix online.',
      );
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        restaurantId: restaurant.id,
        disponivel: true,
      },
      include: {
        optionGroups: {
          include: {
            optionGroup: { include: { options: true } },
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos não encontrados ou indisponíveis.',
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // ── Phase 1: compute base prices (product.preco + option modifiers) ──────
    let originalSubtotal = 0;
    type ItemBase = {
      productId: number;
      productNameSnapshot: string;
      productPriceSnapshot: number;
      quantity: number;
      baseUnitPrice: number;
      categoryId: number | null;
      selectedOptions:
        | typeof Prisma.JsonNull
        | Array<{
            optionGroupId: number;
            optionGroupName: string;
            optionId: number;
            nome: string;
            priceModifier: number;
          }>;
      itemNotes?: string;
    };
    const itemsBase: ItemBase[] = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      let baseUnitPrice = product.preco;
      const selectedOptionSnapshots: Array<{
        optionGroupId: number;
        optionGroupName: string;
        optionId: number;
        nome: string;
        priceModifier: number;
      }> = [];
      const productGroups = product.optionGroups
        .map((link) => link.optionGroup)
        .filter((group) => group.ativo);

      if (item.selectedOptions?.length) {
        const selectedByGroup = new Map<number, typeof item.selectedOptions>();
        for (const sel of item.selectedOptions) {
          const arr = selectedByGroup.get(sel.optionGroupId) ?? [];
          arr.push(sel);
          selectedByGroup.set(sel.optionGroupId, arr);
        }

        for (const [groupId, sels] of selectedByGroup) {
          const group = productGroups.find((g) => g.id === groupId);
          if (!group)
            throw new BadRequestException(
              `Grupo de opções ${groupId} inválido.`,
            );

          const resolvedOptions = sels.map((s) => {
            const opt = group.options.find(
              (o) => o.id === s.optionId && o.available,
            );
            if (!opt)
              throw new BadRequestException(
                `Opção ${s.optionId} inválida ou indisponível.`,
              );
            return opt;
          });

          if (group.priceMode === OptionPriceMode.SUM) {
            baseUnitPrice += resolvedOptions.reduce(
              (sum, o) => sum + o.priceModifier,
              0,
            );
          } else if (group.priceMode === OptionPriceMode.HIGHEST) {
            baseUnitPrice += Math.max(
              ...resolvedOptions.map((o) => o.priceModifier),
            );
          } else {
            baseUnitPrice = Math.max(
              ...resolvedOptions.map((o) => o.priceModifier),
            );
          }

          for (const opt of resolvedOptions) {
            selectedOptionSnapshots.push({
              optionGroupId: group.id,
              optionGroupName: group.nome,
              optionId: opt.id,
              nome: opt.nome,
              priceModifier: opt.priceModifier,
            });
          }
        }
      }

      for (const group of productGroups) {
        const selectedCount = selectedOptionSnapshots.filter(
          (option) => option.optionGroupId === group.id,
        ).length;
        if (
          group.required &&
          selectedCount < Math.max(1, group.minSelections)
        ) {
          throw new BadRequestException(`Selecione ${group.nome}.`);
        }
        if (selectedCount < group.minSelections) {
          throw new BadRequestException(
            `Selecione pelo menos ${group.minSelections} opções em ${group.nome}.`,
          );
        }
        if (selectedCount > group.maxSelections) {
          throw new BadRequestException(
            `Selecione no máximo ${group.maxSelections} opções em ${group.nome}.`,
          );
        }
      }

      originalSubtotal += baseUnitPrice * item.quantity;

      return {
        productId: item.productId,
        productNameSnapshot: product.nome,
        productPriceSnapshot: product.preco,
        quantity: item.quantity,
        baseUnitPrice,
        categoryId: product.categoryId,
        selectedOptions: selectedOptionSnapshots.length
          ? selectedOptionSnapshots
          : Prisma.JsonNull,
        itemNotes: item.itemNotes,
      };
    });

    // ── Phase 2: apply best promotion per item ────────────────────────────────
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const activePromos = await this.promotions.findActive(restaurant.id);

    let promoSubtotal = 0;
    const itemsData = itemsBase.map((item) => {
      const matchingPromos = activePromos.filter((p) => {
        if (p.diasSemana.length > 0 && !p.diasSemana.includes(currentDay))
          return false;
        if (p.horaInicio && currentTime < p.horaInicio) return false;
        if (p.horaFim && currentTime > p.horaFim) return false;
        const matchesProduct = p.productIds.includes(item.productId);
        const matchesCategory =
          item.categoryId != null && p.categoryIds.includes(item.categoryId);
        const noTarget =
          p.productIds.length === 0 && p.categoryIds.length === 0;
        return matchesProduct || matchesCategory || noTarget;
      });

      let bestPrice = item.baseUnitPrice;
      let bestPromoId: number | null = null;

      for (const promo of matchingPromos) {
        let candidate: number;
        if (promo.tipoDesconto === 'PERCENTUAL')
          candidate = item.baseUnitPrice * (1 - promo.valorDesconto / 100);
        else if (promo.tipoDesconto === 'VALOR_FIXO')
          candidate = Math.max(0, item.baseUnitPrice - promo.valorDesconto);
        else candidate = promo.valorDesconto; // PRECO_FIXO
        if (candidate < bestPrice) {
          bestPrice = candidate;
          bestPromoId = promo.id;
        }
      }

      promoSubtotal += bestPrice * item.quantity;

      const { baseUnitPrice, categoryId, ...itemRest } = item;
      return {
        ...itemRest,
        unitPrice: bestPrice,
        itemTotal: bestPrice * item.quantity,
        precoOriginal: bestPromoId != null ? baseUnitPrice : null,
        appliedPromotionId: bestPromoId,
      };
    });

    // E.1 — DeliveryZone check: validate CEP and override fee when provided
    let deliveryFee =
      dto.deliveryType === DeliveryType.DELIVERY ? restaurant.taxaEntrega : 0;
    let zoneMetadata: { zoneName: string; tempoEstimadoMin: number } | null =
      null;

    const isOwnSource = dto.origin !== OrderOrigin.IFOOD;
    if (
      dto.deliveryType === DeliveryType.DELIVERY &&
      dto.deliveryCep &&
      isOwnSource
    ) {
      const zoneResult = await this.deliveryCheck.check(slug, dto.deliveryCep);
      if (!zoneResult.canDeliver) {
        throw new BadRequestException(zoneResult.reason);
      }
      deliveryFee = zoneResult.fretefixo;
      zoneMetadata = {
        zoneName: zoneResult.zoneName,
        tempoEstimadoMin: zoneResult.tempoEstimadoMin,
      };
    }

    const customerPhone = dto.customerPhone.replace(/[^\d+]/g, '');

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { order, tabId } = await this.prisma.$transaction(async (tx) => {
          // ── Promo vs Coupon: choose greater discount ────────────────────────
          const promoSaving = originalSubtotal - promoSubtotal;
          let finalItemsData = itemsData;
          let finalSubtotal = promoSubtotal;
          let discountAmount = 0;
          let couponId: number | undefined;

          if (dto.couponCode) {
            const coupon = await this.coupons.validate(
              restaurant.id,
              dto.couponCode,
              originalSubtotal,
              tx,
            );
            const couponDiscount = this.coupons.calcDiscount(
              coupon,
              originalSubtotal,
              deliveryFee,
            );

            if (couponDiscount > promoSaving) {
              // coupon wins: strip promo from items, use original prices
              finalItemsData = itemsBase.map((item) => {
                const { baseUnitPrice, categoryId, ...rest } = item;
                return {
                  ...rest,
                  unitPrice: baseUnitPrice,
                  itemTotal: baseUnitPrice * item.quantity,
                  precoOriginal: null,
                  appliedPromotionId: null,
                };
              });
              finalSubtotal = originalSubtotal;
              discountAmount = couponDiscount;
              couponId = coupon.id;
              await tx.coupon.update({
                where: { id: coupon.id },
                data: { usedCount: { increment: 1 } },
              });
            }
            // else: promo wins — coupon not applied, usedCount unchanged
          }

          const total = Math.max(
            0,
            finalSubtotal + deliveryFee - discountAmount,
          );

          const last = await tx.order.findFirst({
            where: { restaurantId: restaurant.id },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
          });
          const orderNumber = (last?.orderNumber ?? 0) + 1;
          const customer = await tx.customer.upsert({
            where: {
              restaurantId_phone: {
                restaurantId: restaurant.id,
                phone: customerPhone,
              },
            },
            create: {
              restaurantId: restaurant.id,
              name: dto.customerName,
              phone: customerPhone,
              document: customerDocument,
              lastOrderAt: new Date(),
            },
            update: {
              name: dto.customerName,
              document: customerDocument,
              lastOrderAt: new Date(),
            },
            select: { id: true },
          });

          const tipo = toTabTipo(dto.deliveryType);
          let tab!: { id: number };
          if (dto.deliveryType === DeliveryType.DINE_IN && dto.tableId) {
            const existing = await tx.tab.findFirst({
              where: {
                restaurantId: restaurant.id,
                tableId: dto.tableId,
                status: 'OPEN',
              },
              select: { id: true },
            });
            if (existing) {
              tab = existing;
            } else {
              tab = await tx.tab.create({
                data: {
                  restaurantId: restaurant.id,
                  tipo,
                  tableId: dto.tableId,
                  customerNome: dto.customerName,
                  customerId: customer.id,
                },
                select: { id: true },
              });
            }
          } else {
            tab = await tx.tab.create({
              data: {
                restaurantId: restaurant.id,
                tipo,
                tableId: dto.tableId,
                customerNome: dto.customerName,
                customerId: customer.id,
              },
              select: { id: true },
            });
          }

          const order = await tx.order.create({
            data: {
              restaurantId: restaurant.id,
              customerId: customer.id,
              orderNumber,
              customerName: dto.customerName,
              customerPhone,
              customerAddress: zoneMetadata
                ? {
                    ...(dto.customerAddress ?? {}),
                    deliveryZone: zoneMetadata.zoneName,
                    deliveryZoneEta: zoneMetadata.tempoEstimadoMin,
                  }
                : ((dto.customerAddress as unknown as Prisma.InputJsonObject) ??
                  Prisma.DbNull),
              deliveryType: dto.deliveryType,
              deliveryFee,
              subtotal: finalSubtotal,
              discountAmount,
              total,
              tabId: tab.id,
              couponId,
              couponCode: dto.couponCode?.toUpperCase(),
              notes: dto.notes,
              items: { create: finalItemsData },
              history: { create: { toStatus: OrderStatus.PENDING } },
            },
            include: { items: true },
          });

          if (dto.paymentMethod !== PaymentMethod.ONLINE_PIX) {
            await tx.payment.create({
              data: {
                restaurantId: restaurant.id,
                tabId: tab.id,
                metodo: toTabPaymentMethod(dto.paymentMethod),
                valor: new Prisma.Decimal(total),
                status: 'PENDING',
              },
            });
          }

          await this.tabsService.recalculateTotals(tab.id, tx);

          return { order, tabId: tab.id };
        });

        // ONLINE_PIX: create Asaas charge and attach Pix data to the order
        if (dto.paymentMethod === PaymentMethod.ONLINE_PIX) {
          if (!customerDocument) {
            throw new BadRequestException(
              'CPF/CNPJ Ã© obrigatÃ³rio para pagamento Pix online.',
            );
          }

          try {
            const pix = await this.asaasPayment.createPixCharge({
              customerDocument,
              customerName: dto.customerName,
              customerPhone: dto.customerPhone,
              orderId: order.id,
              orderNumber: order.orderNumber,
              restaurantName: restaurant.nome,
              value: order.total,
            });

            const tabPayment = await this.prisma.payment.create({
              data: {
                restaurantId: restaurant.id,
                tabId,
                metodo: TabPaymentMethod.PIX,
                valor: order.total,
                status: 'PENDING',
                pixTransactionId: pix.paymentId,
              },
            });

            this.gateway.emitNewOrder(restaurant.id, order);
            // TODO: persist pixQrCode/pixCopyPaste in Payment via additive migration if re-display is needed
            return {
              order,
              payment: {
                id: tabPayment.id,
                pixTransactionId: pix.paymentId,
                pixQrCode: pix.pixQrCode,
                pixCopyPaste: pix.pixCopyPaste,
              },
            };
          } catch (pixError) {
            this.logger.error('Asaas Pix charge failed', pixError);
            throw new BadRequestException(
              'Pagamento Pix indisponível. Escolha outro método de pagamento.',
            );
          }
        }

        if (order.couponId) {
          this.prisma.campaign
            .updateMany({
              where: { couponId: order.couponId, restaurantId: restaurant.id },
              data: { metaConversoes: { increment: 1 } },
            })
            .catch(() => undefined);
        }

        this.gateway.emitNewOrder(restaurant.id, order);
        return order;
      } catch (error: unknown) {
        if (isPrismaUniqueError(error) && attempt < 2) continue;
        throw error;
      }
    }

    throw new BadRequestException(
      'Não foi possível criar o pedido. Tente novamente.',
    );
  }

  async handlePaymentWebhook(
    token: string | undefined,
    body: unknown,
  ): Promise<{ received: boolean; ignored?: boolean }> {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expectedToken && token !== expectedToken) {
      throw new ForbiddenException('Webhook inválido.');
    }

    const payload = body as AsaasOrderWebhookPayload;
    const extRef = payload.payment?.externalReference;

    if (!extRef?.startsWith('order:')) return { received: true, ignored: true };

    const orderId = Number(extRef.split(':')[1]);
    if (!orderId) return { received: true, ignored: true };

    const event = payload.event;
    if (event !== 'PAYMENT_CONFIRMED' && event !== 'PAYMENT_RECEIVED') {
      return { received: true, ignored: true };
    }

    const asaasPaymentId = payload.payment?.id;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      select: { id: true, restaurantId: true, tabId: true },
    });

    if (!order) return { received: true, ignored: true };

    if (asaasPaymentId) {
      const confirmedPayment = await this.prisma.payment.findFirst({
        where: { pixTransactionId: asaasPaymentId, status: 'CONFIRMED' },
      });
      if (confirmedPayment) return { received: true, ignored: true };
    }

    await this.prisma.$transaction(async (tx) => {
      if (order.tabId && asaasPaymentId) {
        const payment = await tx.payment.findFirst({
          where: {
            tabId: order.tabId,
            pixTransactionId: asaasPaymentId,
            status: 'PENDING',
          },
        });
        if (payment) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'CONFIRMED', recebidoEm: new Date() },
          });

          const totals = await this.tabsService.recalculateTotals(
            order.tabId,
            tx,
          );

          const tab = await tx.tab.findUnique({
            where: { id: order.tabId },
            select: { tipo: true },
          });
          if (
            tab?.tipo === TabTipo.DELIVERY &&
            totals.totalPago >= totals.total &&
            totals.total > 0
          ) {
            await tx.tab.update({
              where: { id: order.tabId },
              data: { status: 'CLOSED', closedAt: new Date() },
            });
          }
        }
      }
    });

    this.gateway.emitPaymentConfirmed(order.restaurantId, orderId);

    return { received: true };
  }

  findAll(restaurantId: number, query: ListOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = { restaurantId };
    if (query.status) where.orderStatus = query.status;
    const origins = query.origin?.length ? query.origin : query.origins;
    if (origins?.length) where.origin = { in: origins };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom)
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(
          query.dateFrom,
        );
      if (query.dateTo)
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(query.dateTo);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createManualOrder(restaurantId: number, dto: CreateManualOrderDto) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId },
      select: { id: true, taxaEntrega: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');

    if (dto.deliveryType === DeliveryType.DELIVERY && !dto.customerAddress) {
      throw new BadRequestException('Endereço é obrigatório para entrega.');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId, disponivel: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos não encontrados ou indisponíveis.',
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.preco;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        productNameSnapshot: product.nome,
        productPriceSnapshot: product.preco,
        quantity: item.quantity,
        unitPrice,
        selectedOptions: Prisma.JsonNull,
        itemNotes: item.itemNotes,
        itemTotal,
      };
    });

    const deliveryFee =
      dto.deliveryType === DeliveryType.DELIVERY ? restaurant.taxaEntrega : 0;
    const total = subtotal + deliveryFee;
    const customerPhone = dto.customerPhone.replace(/[^\d+]/g, '');

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const order = await this.prisma.$transaction(async (tx) => {
          const last = await tx.order.findFirst({
            where: { restaurantId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
          });
          const orderNumber = (last?.orderNumber ?? 0) + 1;

          const customer = await tx.customer.upsert({
            where: {
              restaurantId_phone: { restaurantId, phone: customerPhone },
            },
            create: {
              restaurantId,
              name: dto.customerName,
              phone: customerPhone,
              lastOrderAt: new Date(),
            },
            update: { name: dto.customerName, lastOrderAt: new Date() },
            select: { id: true },
          });

          const tipo = toTabTipo(dto.deliveryType);
          let tab!: { id: number };
          if (dto.deliveryType === DeliveryType.DINE_IN && dto.tableId) {
            const existing = await tx.tab.findFirst({
              where: { restaurantId, tableId: dto.tableId, status: 'OPEN' },
              select: { id: true },
            });
            if (existing) {
              tab = existing;
            } else {
              tab = await tx.tab.create({
                data: {
                  restaurantId,
                  tipo,
                  tableId: dto.tableId,
                  customerNome: dto.customerName,
                  customerId: customer.id,
                },
                select: { id: true },
              });
            }
          } else {
            tab = await tx.tab.create({
              data: {
                restaurantId,
                tipo,
                tableId: dto.tableId,
                customerNome: dto.customerName,
                customerId: customer.id,
              },
              select: { id: true },
            });
          }

          const order = await tx.order.create({
            data: {
              restaurantId,
              customerId: customer.id,
              orderNumber,
              customerName: dto.customerName,
              customerPhone,
              customerAddress:
                (dto.customerAddress as unknown as Prisma.InputJsonObject) ??
                Prisma.DbNull,
              deliveryType: dto.deliveryType,
              deliveryFee,
              subtotal,
              discountAmount: 0,
              total,
              tabId: tab.id,
              origin: OrderOrigin.MANUAL,
              notes: dto.notes,
              orderStatus: OrderStatus.CONFIRMED,
              items: { create: itemsData },
              history: { create: { toStatus: OrderStatus.CONFIRMED } },
            },
            include: { items: true },
          });

          await tx.payment.create({
            data: {
              restaurantId,
              tabId: tab.id,
              metodo: toTabPaymentMethod(dto.paymentMethod),
              valor: new Prisma.Decimal(total),
              status: 'PENDING',
            },
          });

          await this.tabsService.recalculateTotals(tab.id, tx);

          return order;
        });

        this.gateway.emitNewOrder(restaurantId, order);
        return order;
      } catch (error: unknown) {
        if (isPrismaUniqueError(error) && attempt < 2) continue;
        throw error;
      }
    }

    throw new BadRequestException(
      'Não foi possível criar o pedido. Tente novamente.',
    );
  }

  async createFromBot(
    restaurantId: number,
    dto: CreateOrderDto,
    externalOrderId: string,
    externalChannel?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });
    if (!restaurant?.slug)
      throw new NotFoundException('Restaurante não encontrado.');

    const result = await this.create(restaurant.slug, dto);
    const order = 'order' in result ? result.order : result;
    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        origin: OrderOrigin.WHATSAPP_BOT,
        externalOrderId,
        externalChannel,
      },
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async updateStatus(
    id: number,
    restaurantId: number,
    newStatus: OrderStatus,
    accountId?: number,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    const allowed = STATUS_TRANSITIONS[order.orderStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de ${order.orderStatus} → ${newStatus} não permitida.`,
      );
    }

    if (
      newStatus === OrderStatus.OUT_FOR_DELIVERY &&
      order.deliveryType !== DeliveryType.DELIVERY
    ) {
      throw new BadRequestException(
        'Saiu para entrega só é válido para pedidos de delivery.',
      );
    }

    const now = new Date();
    const timestamps: Record<string, Date> = {};
    if (newStatus === OrderStatus.CONFIRMED) timestamps.confirmedAt = now;
    if (newStatus === OrderStatus.DELIVERED) timestamps.deliveredAt = now;
    if (newStatus === OrderStatus.CANCELED) timestamps.canceledAt = now;

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { orderStatus: newStatus, ...timestamps },
        include: { items: true },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.orderStatus,
          toStatus: newStatus,
        },
      }),
    ]);

    this.gateway.emitStatusChanged(restaurantId, id, newStatus);
    void this.audit.log(
      restaurantId,
      `ORDER_STATUS_CHANGE`,
      'Order',
      id,
      { from: order.orderStatus, to: newStatus },
      accountId,
    );

    if (newStatus === OrderStatus.DELIVERED) {
      this.gateway.emitWhatsappPrompt(restaurantId, {
        orderId: id,
        customerPhone: updated.customerPhone,
        customerName: updated.customerName,
      });
    }

    if (newStatus === OrderStatus.DELIVERED && updated.customerId) {
      void this.loyalty
        .awardPoints(restaurantId, updated.customerId, id, updated.total)
        .catch(() => undefined);
    }

    return updated;
  }

  async financialSummary(
    restaurantId: number,
    params: {
      period: 'TODAY' | 'WEEK' | 'MONTH';
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const createdAt = getFinancialRange(
      params.period,
      params.dateFrom,
      params.dateTo,
    );

    const payments = await this.prisma.payment.findMany({
      where: { restaurantId, createdAt },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        metodo: true,
        status: true,
        valor: true,
        createdAt: true,
        tab: {
          select: {
            orders: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                total: true,
              },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    const totalBruto = payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.valor), 0);
    const totalPendente = payments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + Number(p.valor), 0);
    const totalTaxas = totalBruto * 0.0299;

    return {
      totalBruto,
      totalTaxas,
      totalLiquido: Math.max(0, totalBruto - totalTaxas),
      totalPendente,
      payments: payments.map((p) => {
        const firstOrder = p.tab?.orders[0];
        return {
          paymentId: p.id,
          orderId: firstOrder?.id ?? null,
          orderNumber: firstOrder?.orderNumber ?? null,
          customerName: firstOrder?.customerName ?? null,
          paymentMethod: p.metodo,
          paymentStatus: p.status,
          total: Number(p.valor),
          createdAt: p.createdAt,
        };
      }),
    };
  }
}
