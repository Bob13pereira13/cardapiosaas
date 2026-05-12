import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async findClients() {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        slug: true,
        createdAt: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        whatsapp: true,
        aberto: true,
        _count: { select: { products: true, orders: true, categories: true } },
        memberships: {
          where: { role: MembershipRole.OWNER, ativo: true },
          select: {
            account: { select: { id: true, email: true, isActive: true } },
          },
          take: 1,
        },
      },
    });
    return restaurants.map((r) => {
      const { memberships, ...rest } = r;
      const owner = memberships[0]?.account;
      return {
        ...rest,
        email: owner?.email ?? null,
        isActive: owner?.isActive ?? false,
      };
    });
  }

  async metrics() {
    const [clientes, pedidos, pagamentosPendentes, pagamentosPagos] =
      await Promise.all([
        this.prisma.restaurant.count(),
        this.prisma.order.count(),
        this.prisma.payment.count({ where: { status: 'PENDING' } }),
        this.prisma.payment.aggregate({
          where: { status: 'CONFIRMED' },
          _sum: { valor: true },
        }),
      ]);

    return {
      clientes,
      pedidos,
      pagamentosPendentes,
      receitaProcessada: Number(pagamentosPagos._sum.valor ?? 0),
    };
  }

  payments() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        createdAt: true,
        restaurant: { select: { id: true, nome: true } },
      },
    });
  }

  subscriptions() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        asaasSubscriptionId: true,
        createdAt: true,
        memberships: {
          where: { role: MembershipRole.OWNER, ativo: true },
          select: { account: { select: { email: true } } },
          take: 1,
        },
      },
    });
  }

  async logs() {
    const [orders, restaurants] = await Promise.all([
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          createdAt: true,
          restaurant: { select: { nome: true } },
        },
      }),
      this.prisma.restaurant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          nome: true,
          createdAt: true,
          memberships: {
            where: { role: MembershipRole.OWNER, ativo: true },
            select: { account: { select: { email: true } } },
            take: 1,
          },
        },
      }),
    ]);

    return {
      orders,
      clients: restaurants.map((r) => ({
        id: r.id,
        nome: r.nome,
        email: r.memberships[0]?.account?.email ?? null,
        createdAt: r.createdAt,
      })),
    };
  }

  async findClient(id: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id },
      select: {
        id: true,
        nome: true,
        slug: true,
        createdAt: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        whatsapp: true,
        aberto: true,
        _count: { select: { products: true, orders: true, categories: true } },
        memberships: {
          where: { role: MembershipRole.OWNER, ativo: true },
          select: {
            account: { select: { id: true, email: true, isActive: true } },
          },
          take: 1,
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const { memberships, ...rest } = restaurant;
    const owner = memberships[0]?.account;
    return {
      ...rest,
      email: owner?.email ?? null,
      isActive: owner?.isActive ?? false,
    };
  }

  testAsaas() {
    return {
      ok: true,
      mode: process.env.ASAAS_API_URL?.includes('sandbox')
        ? 'sandbox'
        : 'production',
    };
  }

  async updateClientStatus(id: number, isActive: boolean) {
    await this.findClient(id);

    const ownerMembership = await this.prisma.membership.findFirst({
      where: { restaurantId: id, role: MembershipRole.OWNER, ativo: true },
      select: { accountId: true },
    });

    if (!ownerMembership) {
      throw new NotFoundException('Proprietário não encontrado.');
    }

    await this.prisma.account.update({
      where: { id: ownerMembership.accountId },
      data: { isActive },
    });

    return this.findClient(id);
  }

  async updateClientSubscription(
    id: number,
    data: { plan?: string; subscriptionStatus?: SubscriptionStatus },
  ) {
    await this.findClient(id);

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        ...(data.plan !== undefined ? { plan: data.plan } : {}),
        ...(data.subscriptionStatus !== undefined
          ? { subscriptionStatus: data.subscriptionStatus }
          : {}),
      },
      select: {
        id: true,
        nome: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });
  }
}
