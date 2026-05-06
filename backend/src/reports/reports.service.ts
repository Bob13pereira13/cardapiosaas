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

  async getAbcCurve(userId: number, params: { period: Period; dateFrom?: string; dateTo?: string }) {
    const createdAt = getRange(params.period, params.dateFrom, params.dateTo);
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { userId, createdAt, orderStatus: { not: OrderStatus.CANCELED } },
      },
      select: {
        productId: true,
        productNameSnapshot: true,
        quantity: true,
        itemTotal: true,
      },
    });

    const map = new Map<number, { productId: number; nome: string; quantity: number; revenue: number }>();
    for (const item of items) {
      const entry = map.get(item.productId!) ?? { productId: item.productId!, nome: item.productNameSnapshot, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.itemTotal;
      map.set(item.productId!, entry);
    }

    const sorted = [...map.values()].sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    return sorted.map((p) => {
      cumulative += p.revenue;
      const share = totalRevenue ? cumulative / totalRevenue : 0;
      return {
        ...p,
        revenueShare: totalRevenue ? p.revenue / totalRevenue : 0,
        cumulativeShare: share,
        class: share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C',
      };
    });
  }

  async getCustomerLtv(userId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { userId },
      include: {
        orders: {
          where: { orderStatus: { not: OrderStatus.CANCELED } },
          select: { total: true, createdAt: true },
        },
      },
    });

    return customers
      .filter((c) => c.orders.length > 0)
      .map((c) => {
        const totalSpent = c.orders.reduce((s, o) => s + o.total, 0);
        const firstOrder = c.orders.reduce((min, o) => o.createdAt < min ? o.createdAt : min, c.orders[0].createdAt);
        const lastOrder = c.orders.reduce((max, o) => o.createdAt > max ? o.createdAt : max, c.orders[0].createdAt);
        const ageMonths = Math.max(1, (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24 * 30));
        return {
          customerId: c.id,
          name: c.name,
          phone: c.phone,
          ordersCount: c.orders.length,
          totalSpent,
          avgOrderValue: totalSpent / c.orders.length,
          ltv: (totalSpent / ageMonths) * 12,
          lastOrderAt: c.lastOrderAt,
        };
      })
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 50);
  }

  async getRevenueByHour(userId: number, params: { period: Period; dateFrom?: string; dateTo?: string }) {
    const createdAt = getRange(params.period, params.dateFrom, params.dateTo);
    const orders = await this.prisma.order.findMany({
      where: { userId, createdAt, orderStatus: { not: OrderStatus.CANCELED } },
      select: { createdAt: true, total: true },
    });

    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, revenue: 0 }));
    for (const order of orders) {
      const h = order.createdAt.getHours();
      hours[h].count += 1;
      hours[h].revenue += order.total;
    }
    return hours;
  }

  async getChurnSignals(userId: number) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const customers = await this.prisma.customer.findMany({
      where: {
        userId,
        lastOrderAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      include: {
        orders: {
          where: { orderStatus: { not: OrderStatus.CANCELED } },
          select: { total: true },
        },
      },
    });

    return customers.map((c) => ({
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      lastOrderAt: c.lastOrderAt,
      ordersCount: c.orders.length,
      totalSpent: c.orders.reduce((s, o) => s + o.total, 0),
      daysSinceLastOrder: c.lastOrderAt
        ? Math.floor((Date.now() - c.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }
}
