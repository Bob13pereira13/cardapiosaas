import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const clientSelect = {
  id: true,
  nome: true,
  email: true,
  slug: true,
  createdAt: true,
  isActive: true,
  plan: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  whatsapp: true,
  aberto: true,
  _count: {
    select: {
      products: true,
      orders: true,
      categories: true,
    },
  },
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  findClients() {
    return this.prisma.user.findMany({
      where: { role: UserRole.RESTAURANT },
      orderBy: { createdAt: 'desc' },
      select: clientSelect,
    });
  }

  async metrics() {
    const [clientes, pedidos, pagamentosPendentes, pagamentosPagos] =
      await Promise.all([
        this.prisma.user.count({ where: { role: UserRole.RESTAURANT } }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { paymentStatus: 'PENDING' } }),
        this.prisma.order.aggregate({
          where: { paymentStatus: 'PAID' },
          _sum: { total: true },
        }),
      ]);

    return {
      clientes,
      pedidos,
      pagamentosPendentes,
      receitaProcessada: pagamentosPagos._sum.total ?? 0,
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
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        user: { select: { id: true, nome: true, email: true } },
      },
    });
  }

  subscriptions() {
    return this.prisma.user.findMany({
      where: { role: UserRole.RESTAURANT },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        asaasSubscriptionId: true,
        createdAt: true,
      },
    });
  }

  async logs() {
    const [orders, clients] = await Promise.all([
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          paymentStatus: true,
          createdAt: true,
          user: { select: { nome: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.RESTAURANT },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, nome: true, email: true, createdAt: true },
      }),
    ]);

    return {
      orders,
      clients,
    };
  }

  async findClient(id: number) {
    const client = await this.prisma.user.findFirst({
      where: { id, role: UserRole.RESTAURANT },
      select: clientSelect,
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return client;
  }

  testAsaas() {
    return {
      ok: true,
      mode: process.env.ASAAS_API_URL?.includes('sandbox') ? 'sandbox' : 'production',
    };
  }

  async updateClientStatus(id: number, isActive: boolean) {
    await this.findClient(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: clientSelect,
    });
  }

  async updateClientSubscription(
    id: number,
    data: { plan?: string; subscriptionStatus?: SubscriptionStatus },
  ) {
    await this.findClient(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.plan !== undefined ? { plan: data.plan } : {}),
        ...(data.subscriptionStatus !== undefined
          ? { subscriptionStatus: data.subscriptionStatus }
          : {}),
      },
      select: clientSelect,
    });
  }
}
