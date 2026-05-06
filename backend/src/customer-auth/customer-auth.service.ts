import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerAuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async requestPin(phone: string, userId: number) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await bcrypt.hash(pin, 10);
    const pinExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const customer = await this.prisma.customer.upsert({
      where: { userId_phone: { userId, phone } },
      create: { userId, name: phone, phone },
      update: {},
      select: { id: true },
    });

    await this.prisma.customerAuth.upsert({
      where: { customerId: customer.id },
      create: { customerId: customer.id, phone, userId, pin: pinHash, pinExpiry },
      update: { pin: pinHash, pinExpiry },
    });

    if (process.env.SMTP_HOST) {
      console.log(`[CustomerAuth] PIN ${pin} para ${phone}`);
    } else {
      console.log(`[CustomerAuth DEV] PIN ${pin} para ${phone} (userId ${userId})`);
    }

    return { sent: true };
  }

  async verifyPin(phone: string, userId: number, pin: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { userId, phone },
      include: { auth: true },
    });

    if (!customer?.auth?.pin) throw new BadRequestException('PIN não solicitado.');
    if (customer.auth.pinExpiry && customer.auth.pinExpiry < new Date()) {
      throw new BadRequestException('PIN expirado. Solicite um novo.');
    }

    const valid = await bcrypt.compare(pin, customer.auth.pin);
    if (!valid) throw new BadRequestException('PIN inválido.');

    await this.prisma.customerAuth.update({
      where: { customerId: customer.id },
      data: { pin: null, pinExpiry: null },
    });

    const token = this.jwt.sign(
      { sub: customer.id, userId, role: 'CUSTOMER' },
      { expiresIn: '30d' },
    );

    return {
      token,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    };
  }

  async getMe(customerId: number, userId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      include: {
        loyaltyPoints: { where: { userId } },
      },
    });
    if (!customer) throw new BadRequestException('Cliente não encontrado.');
    const loyalty = customer.loyaltyPoints[0];
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      loyaltyPoints: loyalty?.points ?? 0,
      totalEarned: loyalty?.totalEarned ?? 0,
    };
  }

  getOrders(customerId: number, userId: number) {
    return this.prisma.order.findMany({
      where: { customerId, userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { items: true },
    });
  }
}
