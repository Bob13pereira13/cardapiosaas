import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async requestPin(phone: string, restaurantId: number) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await bcrypt.hash(pin, 10);
    const pinExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const customer = await this.prisma.customer.upsert({
      where: { restaurantId_phone: { restaurantId, phone } },
      create: {
        restaurantId,
        name: phone,
        phone,
      },
      update: {},
      select: { id: true },
    });

    await this.prisma.customerAuth.upsert({
      where: { customerId: customer.id },
      create: {
        customerId: customer.id,
        phone,
        restaurantId,
        pin: pinHash,
        pinExpiry,
      },
      update: { pin: pinHash, pinExpiry },
    });

    // TODO: entregar PIN via MailService (email) ou SMS quando integração estiver pronta
    // Em dev, consulte CustomerAuth.pin (hash) no banco e use bcrypt.compare para validar
    return { sent: true };
  }

  async verifyPin(phone: string, restaurantId: number, pin: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { restaurantId, phone },
      include: { auth: true },
    });

    if (!customer?.auth?.pin)
      throw new BadRequestException('PIN não solicitado.');
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
      { sub: customer.id, restaurantId, role: 'CUSTOMER' },
      { expiresIn: '30d' },
    );

    return {
      token,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    };
  }

  async getMe(customerId: number, restaurantId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
      include: {
        loyaltyPoints: { where: { restaurantId } },
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

  getOrders(customerId: number, restaurantId: number) {
    return this.prisma.order.findMany({
      where: { customerId, restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { items: true },
    });
  }
}
