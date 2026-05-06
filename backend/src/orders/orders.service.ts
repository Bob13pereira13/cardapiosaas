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
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrdersGateway } from './orders.gateway';
import { AsaasPaymentService } from './asaas-payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

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

function getFinancialRange(period: 'TODAY' | 'WEEK' | 'MONTH', dateFrom?: string, dateTo?: string) {
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
    const user = await this.prisma.user.findFirst({
      where:
        normalizedHost && slug === 'domain'
          ? {
              customDomain: normalizedHost,
            }
          : { slug },
      select: {
        id: true,
        nome: true,
        taxaEntrega: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });
    if (!user) throw new NotFoundException('Estabelecimento não encontrado.');

    let subscriptionStatus = user.subscriptionStatus;
    if (
      subscriptionStatus === SubscriptionStatus.TRIAL &&
      user.trialEndsAt &&
      user.trialEndsAt.getTime() < Date.now()
    ) {
      subscriptionStatus = SubscriptionStatus.OVERDUE;
      await this.prisma.user.update({
        where: { id: user.id },
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
      where: { id: { in: productIds }, userId: user.id, disponivel: true },
      include: { optionGroups: { include: { options: true } } },
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
      let unitPrice = product.preco;
      const selectedOptionSnapshots: Array<{
        optionGroupId: number;
        optionId: number;
        nome: string;
        priceModifier: number;
      }> = [];

      if (item.selectedOptions?.length) {
        const selectedByGroup = new Map<number, typeof item.selectedOptions>();
        for (const sel of item.selectedOptions) {
          const arr = selectedByGroup.get(sel.optionGroupId) ?? [];
          arr.push(sel);
          selectedByGroup.set(sel.optionGroupId, arr);
        }

        for (const [groupId, sels] of selectedByGroup) {
          const group = product.optionGroups.find((g) => g.id === groupId);
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
            unitPrice += resolvedOptions.reduce(
              (sum, o) => sum + o.priceModifier,
              0,
            );
          } else {
            unitPrice += Math.max(
              ...resolvedOptions.map((o) => o.priceModifier),
            );
          }

          for (const opt of resolvedOptions) {
            selectedOptionSnapshots.push({
              optionGroupId: group.id,
              optionId: opt.id,
              nome: opt.nome,
              priceModifier: opt.priceModifier,
            });
          }
        }
      }

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      return {
        productId: item.productId,
        productNameSnapshot: product.nome,
        productPriceSnapshot: product.preco,
        quantity: item.quantity,
        unitPrice,
        selectedOptions: selectedOptionSnapshots.length
          ? selectedOptionSnapshots
          : Prisma.JsonNull,
        itemNotes: item.itemNotes,
        itemTotal,
      };
    });

    const deliveryFee =
      dto.deliveryType === DeliveryType.DELIVERY ? user.taxaEntrega : 0;
    const customerPhone = dto.customerPhone.replace(/[^\d+]/g, '');

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const order = await this.prisma.$transaction(async (tx) => {
          let discountAmount = 0;
          let couponId: number | undefined;

          if (dto.couponCode) {
            const coupon = await this.coupons.validate(
              user.id,
              dto.couponCode,
              subtotal,
              tx,
            );
            discountAmount = this.coupons.calcDiscount(
              coupon,
              subtotal,
              deliveryFee,
            );
            couponId = coupon.id;
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }

          const total = Math.max(0, subtotal + deliveryFee - discountAmount);

          const last = await tx.order.findFirst({
            where: { userId: user.id },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
          });
          const orderNumber = (last?.orderNumber ?? 0) + 1;
          const customer = await tx.customer.upsert({
            where: {
              userId_phone: {
                userId: user.id,
                phone: customerPhone,
              },
            },
            create: {
              userId: user.id,
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

          const order = await tx.order.create({
            data: {
              userId: user.id,
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
              discountAmount,
              total,
              paymentMethod: dto.paymentMethod,
              couponId,
              couponCode: dto.couponCode?.toUpperCase(),
              notes: dto.notes,
              items: { create: itemsData },
              history: { create: { toStatus: OrderStatus.PENDING } },
            },
            include: { items: true },
          });

          return order;
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
              restaurantName: user.nome,
              value: order.total,
            });

            const orderWithPix = await this.prisma.order.update({
              where: { id: order.id },
              data: {
                externalPaymentId: pix.paymentId,
                pixQrCode: pix.pixQrCode,
                pixCopyPaste: pix.pixCopyPaste,
              },
              include: { items: true },
            });

            this.gateway.emitNewOrder(user.id, orderWithPix);
            return orderWithPix;
          } catch (pixError) {
            this.logger.error('Asaas Pix charge failed', pixError);
            await this.prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: PaymentStatus.FAILED },
            });
            throw new BadRequestException(
              'Pagamento Pix indisponível. Escolha outro método de pagamento.',
            );
          }
        }

        this.gateway.emitNewOrder(user.id, order);
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

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      select: { id: true, userId: true, paymentStatus: true },
    });

    if (!order || order.paymentStatus === PaymentStatus.PAID) {
      return { received: true, ignored: true };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
    });

    this.gateway.emitPaymentConfirmed(order.userId, orderId);

    return { received: true };
  }

  findAll(userId: number, query: ListOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = { userId };
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

  async createManualOrder(userId: number, dto: CreateManualOrderDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, taxaEntrega: true },
    });
    if (!user) throw new NotFoundException('Restaurante não encontrado.');

    if (dto.deliveryType === DeliveryType.DELIVERY && !dto.customerAddress) {
      throw new BadRequestException('Endereço é obrigatório para entrega.');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, userId, disponivel: true },
      include: { optionGroups: { include: { options: true } } },
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
      dto.deliveryType === DeliveryType.DELIVERY ? user.taxaEntrega : 0;
    const total = subtotal + deliveryFee;
    const customerPhone = dto.customerPhone.replace(/[^\d+]/g, '');

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const order = await this.prisma.$transaction(async (tx) => {
          const last = await tx.order.findFirst({
            where: { userId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
          });
          const orderNumber = (last?.orderNumber ?? 0) + 1;

          const customer = await tx.customer.upsert({
            where: { userId_phone: { userId, phone: customerPhone } },
            create: {
              userId,
              name: dto.customerName,
              phone: customerPhone,
              lastOrderAt: new Date(),
            },
            update: { name: dto.customerName, lastOrderAt: new Date() },
            select: { id: true },
          });

          return tx.order.create({
            data: {
              userId,
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
              paymentMethod: dto.paymentMethod,
              origin: OrderOrigin.MANUAL,
              notes: dto.notes,
              orderStatus: OrderStatus.CONFIRMED,
              items: { create: itemsData },
              history: { create: { toStatus: OrderStatus.CONFIRMED } },
            },
            include: { items: true },
          });
        });

        this.gateway.emitNewOrder(userId, order);
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
    userId: number,
    dto: CreateOrderDto,
    externalOrderId: string,
    externalChannel?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { slug: true },
    });
    if (!user?.slug)
      throw new NotFoundException('Restaurante nÃ£o encontrado.');

    const order = await this.create(user.slug, dto);
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

  async findOne(id: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async updateStatus(id: number, userId: number, newStatus: OrderStatus) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
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

    this.gateway.emitStatusChanged(userId, id, newStatus);
    return updated;
  }

  async financialSummary(
    userId: number,
    params: { period: 'TODAY' | 'WEEK' | 'MONTH'; dateFrom?: string; dateTo?: string },
  ) {
    const createdAt = getFinancialRange(params.period, params.dateFrom, params.dateTo);
    const payments = await this.prisma.order.findMany({
      where: { userId, createdAt },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
      },
    });

    const totalBruto = payments.reduce((sum, payment) => sum + payment.total, 0);
    const totalPendente = payments
      .filter((payment) => payment.paymentStatus === PaymentStatus.PENDING)
      .reduce((sum, payment) => sum + payment.total, 0);
    const totalTaxas = totalBruto * 0.0299;

    return {
      totalBruto,
      totalTaxas,
      totalLiquido: Math.max(0, totalBruto - totalTaxas),
      totalPendente,
      payments: payments.map((payment) => ({
        orderId: payment.id,
        orderNumber: payment.orderNumber,
        customerName: payment.customerName,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        total: payment.total,
        createdAt: payment.createdAt,
      })),
    };
  }
}
