import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validate(
    userId: number,
    code: string,
    subtotal: number,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const coupon = await db.coupon.findUnique({
      where: { userId_code: { userId, code: code.toUpperCase() } },
    });

    if (!coupon || !coupon.active) {
      throw new BadRequestException('Cupom inválido ou inativo.');
    }
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      throw new BadRequestException('Cupom expirado.');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Cupom esgotado.');
    }
    if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Pedido mínimo de R$ ${coupon.minOrderValue.toFixed(2)} para usar este cupom.`,
      );
    }

    return coupon;
  }

  calcDiscount(
    coupon: {
      type: CouponType;
      value: number;
      maxDiscountAmount: number | null;
    },
    subtotal: number,
    deliveryFee: number,
  ): number {
    let discount = 0;

    if (coupon.type === CouponType.PERCENT) {
      discount = subtotal * (coupon.value / 100);
    } else if (coupon.type === CouponType.FIXED) {
      discount = coupon.value;
    } else if (coupon.type === CouponType.FREE_DELIVERY) {
      discount = deliveryFee;
    }

    if (coupon.maxDiscountAmount !== null) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }

    return discount;
  }

  findAll(userId: number) {
    return this.prisma.coupon.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: number, dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        userId,
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        minOrderValue: dto.minOrderValue ?? null,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        maxUses: dto.maxUses ?? null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async toggle(id: number, userId: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, userId },
    });
    if (!coupon) throw new NotFoundException('Cupom não encontrado.');
    return this.prisma.coupon.update({
      where: { id },
      data: { active: !coupon.active },
    });
  }

  async remove(id: number, userId: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, userId },
    });
    if (!coupon) throw new NotFoundException('Cupom não encontrado.');
    await this.prisma.coupon.delete({ where: { id } });
  }
}
