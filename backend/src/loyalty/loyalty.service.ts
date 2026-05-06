import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        loyaltyEnabled: true,
        loyaltyPointsPerBrl: true,
        loyaltyRedeemRate: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async updateSettings(
    userId: number,
    dto: { loyaltyEnabled?: boolean; loyaltyPointsPerBrl?: number; loyaltyRedeemRate?: number },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        loyaltyEnabled: true,
        loyaltyPointsPerBrl: true,
        loyaltyRedeemRate: true,
      },
    });
  }

  async getCustomerPoints(userId: number, customerId: number) {
    const points = await this.prisma.loyaltyPoints.findUnique({
      where: { customerId_userId: { userId, customerId } },
    });
    const txs = await this.prisma.loyaltyTransaction.findMany({
      where: { userId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { balance: points?.points ?? 0, transactions: txs };
  }

  async awardPoints(userId: number, customerId: number, orderId: number, orderTotal: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyEnabled: true, loyaltyPointsPerBrl: true },
    });
    if (!user?.loyaltyEnabled) return null;

    const points = Math.floor(orderTotal * user.loyaltyPointsPerBrl);
    if (points <= 0) return null;

    await this.prisma.$transaction([
      this.prisma.loyaltyPoints.upsert({
        where: { customerId_userId: { userId, customerId } },
        create: { userId, customerId, points, totalEarned: points },
        update: { points: { increment: points }, totalEarned: { increment: points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: { userId, customerId, orderId, points, type: 'EARNED' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { loyaltyPointsEarned: points },
      }),
    ]);

    return points;
  }

  async redeemPoints(userId: number, customerId: number, orderId: number, points: number) {
    const current = await this.prisma.loyaltyPoints.findUnique({
      where: { customerId_userId: { userId, customerId } },
    });
    if (!current || current.points < points) {
      throw new NotFoundException('Pontos insuficientes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyRedeemRate: true },
    });
    const discount = points / (user?.loyaltyRedeemRate ?? 100);

    await this.prisma.$transaction([
      this.prisma.loyaltyPoints.update({
        where: { customerId_userId: { userId, customerId } },
        data: { points: { decrement: points }, totalSpent: { increment: points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: { userId, customerId, orderId, points: -points, type: 'REDEEMED' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { loyaltyPointsUsed: points },
      }),
    ]);

    return { discount };
  }
}
