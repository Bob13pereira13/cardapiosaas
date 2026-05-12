import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getSettings(restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        loyaltyEnabled: true,
        loyaltyPointsPerBrl: true,
        loyaltyRedeemRate: true,
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');
    return restaurant;
  }

  async updateSettings(
    restaurantId: number,
    dto: {
      loyaltyEnabled?: boolean;
      loyaltyPointsPerBrl?: number;
      loyaltyRedeemRate?: number;
    },
  ) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: dto,
      select: {
        loyaltyEnabled: true,
        loyaltyPointsPerBrl: true,
        loyaltyRedeemRate: true,
      },
    });
  }

  async getCustomerPoints(restaurantId: number, customerId: number) {
    const points = await this.prisma.loyaltyPoints.findUnique({
      where: { customerId_restaurantId: { restaurantId, customerId } },
    });
    const txs = await this.prisma.loyaltyTransaction.findMany({
      where: { restaurantId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      balance: points?.points ?? 0,
      points: points?.points ?? 0,
      totalEarned: points?.totalEarned ?? 0,
      totalSpent: points?.totalSpent ?? 0,
      transactions: txs,
    };
  }

  async awardPoints(
    restaurantId: number,
    customerId: number,
    orderId: number,
    orderTotal: number,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { loyaltyEnabled: true, loyaltyPointsPerBrl: true },
    });
    if (!restaurant?.loyaltyEnabled) return null;

    const points = Math.floor(orderTotal * restaurant.loyaltyPointsPerBrl);
    if (points <= 0) return null;

    await this.prisma.$transaction([
      this.prisma.loyaltyPoints.upsert({
        where: { customerId_restaurantId: { restaurantId, customerId } },
        create: {
          restaurantId,
          customerId,
          points,
          totalEarned: points,
        },
        update: {
          points: { increment: points },
          totalEarned: { increment: points },
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          restaurantId,
          customerId,
          orderId,
          points,
          type: 'EARNED',
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { loyaltyPointsEarned: points },
      }),
    ]);

    return points;
  }

  async getOverview(restaurantId: number) {
    const [rows, totals] = await Promise.all([
      this.prisma.loyaltyPoints.findMany({
        where: { restaurantId },
        select: {
          customerId: true,
          points: true,
          totalEarned: true,
          totalSpent: true,
        },
      }),
      this.prisma.loyaltyPoints.aggregate({
        where: { restaurantId },
        _sum: { totalEarned: true, totalSpent: true },
        _count: { customerId: true },
      }),
    ]);

    const activeParticipants = rows.filter((r) => r.totalEarned > 0).length;
    return {
      totalCustomers: totals._count.customerId,
      totalPointsIssued: totals._sum.totalEarned ?? 0,
      totalRedeemed: totals._sum.totalSpent ?? 0,
      activeParticipants,
    };
  }

  async getTopCustomers(restaurantId: number) {
    return this.prisma.loyaltyPoints.findMany({
      where: { restaurantId },
      orderBy: { points: 'desc' },
      take: 50,
      include: { customer: { select: { name: true, phone: true } } },
    });
  }

  async redeemForCoupon(
    restaurantId: number,
    customerId: number,
    points: number,
  ) {
    const current = await this.prisma.loyaltyPoints.findUnique({
      where: { customerId_restaurantId: { restaurantId, customerId } },
    });
    if (!current || current.points < points) {
      throw new Error('Pontos insuficientes.');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { loyaltyRedeemRate: true },
    });
    const discountValue = points / (restaurant?.loyaltyRedeemRate ?? 100);

    const code = `FIDELIDADE${Date.now()}`;
    const coupon = await this.prisma.coupon.create({
      data: {
        restaurantId,
        code,
        type: 'FIXED',
        value: discountValue,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.$transaction([
      this.prisma.loyaltyPoints.update({
        where: { customerId_restaurantId: { restaurantId, customerId } },
        data: {
          points: { decrement: points },
          totalSpent: { increment: points },
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          restaurantId,
          customerId,
          points: -points,
          type: 'REDEEMED',
          description: `Cupom ${code}`,
        },
      }),
    ]);

    return { coupon, discountValue };
  }

  async redeemPoints(
    restaurantId: number,
    customerId: number,
    orderId: number,
    points: number,
  ) {
    const current = await this.prisma.loyaltyPoints.findUnique({
      where: { customerId_restaurantId: { restaurantId, customerId } },
    });
    if (!current || current.points < points) {
      throw new NotFoundException('Pontos insuficientes.');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { loyaltyRedeemRate: true },
    });
    const discount = points / (restaurant?.loyaltyRedeemRate ?? 100);

    await this.prisma.$transaction([
      this.prisma.loyaltyPoints.update({
        where: { customerId_restaurantId: { restaurantId, customerId } },
        data: {
          points: { decrement: points },
          totalSpent: { increment: points },
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          restaurantId,
          customerId,
          orderId,
          points: -points,
          type: 'REDEEMED',
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { loyaltyPointsUsed: points },
      }),
    ]);

    return { discount };
  }
}
