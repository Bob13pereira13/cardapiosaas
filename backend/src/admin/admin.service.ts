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
