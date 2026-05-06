import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

function getRange(period: Period, dateFrom?: string, dateTo?: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'WEEK') start.setDate(start.getDate() - 6);
  if (period === 'MONTH') start.setDate(start.getDate() - 29);
  if (period === 'CUSTOM' && dateFrom) {
    const customStart = new Date(dateFrom);
    customStart.setHours(0, 0, 0, 0);
    start.setTime(customStart.getTime());
  }

  const end = dateTo ? new Date(dateTo) : new Date(now);
  if (dateTo) end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async summary(userId: number, params: { period: Period; dateFrom?: string; dateTo?: string }) {
    const createdAt = getRange(params.period, params.dateFrom, params.dateTo);
    const orders = await this.prisma.order.findMany({
      where: { userId, createdAt },
      include: { items: { include: { product: { include: { category: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    const billable = orders.filter((order) => order.orderStatus !== OrderStatus.CANCELED);
    const totalRevenue = billable.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageTicket = billable.length ? totalRevenue / billable.length : 0;
    const cancelRate = totalOrders ? (orders.length - billable.length) / totalOrders : 0;

    const products = new Map<string, { nome: string; count: number; revenue: number }>();
    const categories = new Map<string, { nome: string; count: number }>();
    const payments = new Map<string, { method: string; count: number; total: number }>();
    const days = new Map<string, { date: string; orders: number; revenue: number }>();
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const day = days.get(date) ?? { date, orders: 0, revenue: 0 };
      day.orders += 1;
      if (order.orderStatus !== OrderStatus.CANCELED) day.revenue += order.total;
      days.set(date, day);
      hours[order.createdAt.getHours()].count += 1;

      const payment = payments.get(order.paymentMethod) ?? { method: order.paymentMethod, count: 0, total: 0 };
      payment.count += 1;
      payment.total += order.total;
      payments.set(order.paymentMethod, payment);

      for (const item of order.items) {
        const product = products.get(item.productNameSnapshot) ?? { nome: item.productNameSnapshot, count: 0, revenue: 0 };
        product.count += item.quantity;
        product.revenue += item.itemTotal;
        products.set(item.productNameSnapshot, product);

        const categoryName = item.product?.category?.nome ?? 'Sem categoria';
        const category = categories.get(categoryName) ?? { nome: categoryName, count: 0 };
        category.count += item.quantity;
        categories.set(categoryName, category);
      }
    }

    return {
      totalRevenue,
      totalOrders,
      averageTicket,
      cancelRate,
      topProducts: [...products.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      topCategories: [...categories.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      paymentMethods: [...payments.values()],
      dailySeries: [...days.values()],
      peakHours: hours,
    };
  }
}
