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

  async update(userId: number, customerId: number, data: { tags?: string[] }) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente nÃ£o encontrado.');

    return this.prisma.customer.update({
      where: { id: customer.id },
      data,
    });
  }

  async findOrders(userId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      select: {
        id: true,
        name: true,
        phone: true,
        document: true,
        tags: true,
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
      tags: customer.tags,
    };
  }

  async anonymize(userId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    await this.prisma.$transaction([
      this.prisma.customerAuth.deleteMany({ where: { customerId } }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          name: `Anonimizado #${customerId}`,
          phone: '',
          document: null,
        },
      }),
    ]);

    return { anonymized: true };
  }

  async exportGdpr(userId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      include: {
        orders: {
          include: { items: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer;
  }

  async findInactive(userId: number, daysSince: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysSince);
    const customers = await this.prisma.customer.findMany({
      where: {
        userId,
        OR: [
          { lastOrderAt: { lt: cutoff } },
          { lastOrderAt: null, createdAt: { lt: cutoff } },
        ],
      },
      orderBy: { lastOrderAt: 'asc' },
    });
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      lastOrderAt: c.lastOrderAt,
      createdAt: c.createdAt,
    }));
  }

  async exportCsv(userId: number) {
    const customers = await this.findAll(userId);
    const lines = [
      ['Nome', 'Telefone', 'Documento', 'Pedidos', 'Total gasto', 'Ultimo pedido'],
      ...customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.document ?? '',
        String(customer.ordersCount),
        String(customer.totalSpent),
        customer.lastOrderAt ? new Date(customer.lastOrderAt).toISOString() : '',
      ]),
    ];

    return lines
      .map((line) =>
        line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }
}
