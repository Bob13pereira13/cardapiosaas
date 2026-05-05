import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { userId },
      orderBy: [{ lastOrderAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      document: customer.document,
      createdAt: customer.createdAt,
      lastOrderAt: customer.lastOrderAt,
      ordersCount: customer.orders.length,
      totalSpent: customer.orders.reduce((sum, order) => sum + order.total, 0),
      lastOrder: customer.orders[0] ?? null,
    }));
  }

  async findOrders(userId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      select: {
        id: true,
        name: true,
        phone: true,
        document: true,
      },
    });

    if (!customer) throw new NotFoundException('Cliente nÃ£o encontrado.');

    const orders = await this.prisma.order.findMany({
      where: { customerId, userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return {
      ...customer,
      orders,
      ordersCount: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
    };
  }
}
