import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Granularity, TrendPeriod } from './dto/trend-query.dto';
import type {
  OriginResponse,
  PeriodRange,
  RevenueResponse,
  SummaryResponse,
  TopProductsResponse,
} from './dto/period-comparison.dto';

const DAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

function safePercent(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function getCurrentRange(
  period: 'current_month' | 'current_week' | 'current_year',
): PeriodRange {
  const now = new Date();
  if (period === 'current_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: now,
    };
  }
  if (period === 'current_week') {
    const day = now.getDay(); // 0=Sun
    const from = new Date(now);
    from.setDate(now.getDate() - day);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  // current_year
  return {
    from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
    to: now,
  };
}

function getPreviousRange(
  period: 'current_month' | 'current_week' | 'current_year',
): PeriodRange {
  const now = new Date();
  if (period === 'current_month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfPrev = new Date(firstOfMonth.getTime() - 1);
    return {
      from: new Date(
        lastOfPrev.getFullYear(),
        lastOfPrev.getMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
      to: new Date(
        lastOfPrev.getFullYear(),
        lastOfPrev.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    };
  }
  if (period === 'current_week') {
    const day = now.getDay();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - day);
    thisWeekStart.setHours(0, 0, 0, 0);
    const prevWeekEnd = new Date(thisWeekStart.getTime() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekEnd.getDate() - 6);
    prevWeekStart.setHours(0, 0, 0, 0);
    return { from: prevWeekStart, to: prevWeekEnd };
  }
  // current_year → previous full year
  return {
    from: new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0),
    to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
  };
}

function getLastNRange(period: TrendPeriod): PeriodRange {
  const now = new Date();
  const map: Record<string, number> = {
    last_7d: 7,
    last_30d: 30,
    last_90d: 90,
    last_12m: 365,
    last_24m: 730,
  };
  const days = map[period];
  const from = new Date(now);
  from.setDate(now.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}

const VALID_COMBOS: Record<Granularity, TrendPeriod[]> = {
  day: ['last_7d', 'last_30d', 'last_90d'],
  month: ['last_12m', 'last_24m', 'current_year'],
};

function resolveRange(period: TrendPeriod): PeriodRange {
  if (
    period === 'current_month' ||
    period === 'current_week' ||
    period === 'current_year'
  ) {
    return getCurrentRange(period);
  }
  return getLastNRange(period);
}

@Injectable()
export class TrendsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(
    restaurantId: number,
    period: 'current_month' | 'current_week' | 'current_year' = 'current_month',
  ): Promise<SummaryResponse> {
    const cur = getCurrentRange(period);
    const prev = getPreviousRange(period);

    const [curOrders, prevOrders, curNewCustomers, prevNewCustomers] =
      await Promise.all([
        this.prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: cur.from, lte: cur.to },
          },
          select: { total: true, orderStatus: true },
        }),
        this.prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: prev.from, lte: prev.to },
          },
          select: { total: true, orderStatus: true },
        }),
        this.prisma.customer.count({
          where: {
            restaurantId,
            firstOrderAt: { gte: cur.from, lte: cur.to },
          },
        }),
        this.prisma.customer.count({
          where: {
            restaurantId,
            firstOrderAt: { gte: prev.from, lte: prev.to },
          },
        }),
      ]);

    const billable = (orders: typeof curOrders) =>
      orders.filter((o) => o.orderStatus !== OrderStatus.CANCELED);

    const curBill = billable(curOrders);
    const prevBill = billable(prevOrders);

    const curRevenue = curBill.reduce((s, o) => s + o.total, 0);
    const prevRevenue = prevBill.reduce((s, o) => s + o.total, 0);
    const curOrderCount = curBill.length;
    const prevOrderCount = prevBill.length;
    const curAvg = curOrderCount ? curRevenue / curOrderCount : 0;
    const prevAvg = prevOrderCount ? prevRevenue / prevOrderCount : 0;

    return {
      period,
      from: cur.from.toISOString(),
      to: cur.to.toISOString(),
      cards: {
        revenue: {
          current: Math.round(curRevenue * 100) / 100,
          previous: Math.round(prevRevenue * 100) / 100,
          change: Math.round((curRevenue - prevRevenue) * 100) / 100,
          changePercent: safePercent(curRevenue, prevRevenue),
        },
        orders: {
          current: curOrderCount,
          previous: prevOrderCount,
          change: curOrderCount - prevOrderCount,
          changePercent: safePercent(curOrderCount, prevOrderCount),
        },
        averageTicket: {
          current: Math.round(curAvg * 100) / 100,
          previous: Math.round(prevAvg * 100) / 100,
          change: Math.round((curAvg - prevAvg) * 100) / 100,
          changePercent: safePercent(curAvg, prevAvg),
        },
        newCustomers: {
          current: curNewCustomers,
          previous: prevNewCustomers,
          change: curNewCustomers - prevNewCustomers,
          changePercent: safePercent(curNewCustomers, prevNewCustomers),
        },
      },
    };
  }

  async revenue(
    restaurantId: number,
    granularity: Granularity = 'day',
    period: TrendPeriod = 'last_30d',
  ): Promise<RevenueResponse> {
    const allowed = VALID_COMBOS[granularity];
    if (!allowed.includes(period)) {
      throw new BadRequestException(
        `Combinação inválida: granularity=${granularity} não suporta period=${period}. Use: ${allowed.join(', ')}`,
      );
    }

    const range =
      period === 'current_year'
        ? getCurrentRange('current_year')
        : getLastNRange(period);

    const truncUnit = granularity === 'day' ? 'day' : 'month';

    type RawRow = { bucket: Date; revenue: string; orders: string };
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC(${truncUnit}, "createdAt") AS bucket,
        COALESCE(SUM(total), 0)              AS revenue,
        COUNT(*)::int                        AS orders
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "createdAt"    >= ${range.from}
        AND "createdAt"    <= ${range.to}
        AND "orderStatus"  != ${OrderStatus.CANCELED}::"OrderStatus"
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    // Build a complete date map (no gaps)
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const row of rows) {
      const key =
        granularity === 'day'
          ? row.bucket.toISOString().slice(0, 10)
          : row.bucket.toISOString().slice(0, 7);
      map.set(key, {
        revenue: Math.round(Number(row.revenue) * 100) / 100,
        orders: Number(row.orders),
      });
    }

    // Generate full sequence of buckets with zero-fill
    const data: { date: string; revenue: number; orders: number }[] = [];
    const cursor = new Date(range.from);
    cursor.setHours(0, 0, 0, 0);
    const end = range.to;

    while (cursor <= end) {
      const key =
        granularity === 'day'
          ? cursor.toISOString().slice(0, 10)
          : cursor.toISOString().slice(0, 7);

      if (!data.length || data[data.length - 1].date !== key) {
        const point = map.get(key) ?? { revenue: 0, orders: 0 };
        data.push({ date: key, ...point });
      }

      if (granularity === 'day') {
        cursor.setDate(cursor.getDate() + 1);
      } else {
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = data.reduce((s, d) => s + d.orders, 0);
    const averageDaily =
      data.length > 0
        ? Math.round((totalRevenue / data.length) * 100) / 100
        : 0;

    return {
      granularity,
      period,
      data,
      summary: {
        total: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        averageDaily,
      },
    };
  }

  async topProducts(
    restaurantId: number,
    period: TrendPeriod = 'last_30d',
    limit = 10,
    orderBy: 'revenue' | 'quantity' = 'revenue',
  ): Promise<TopProductsResponse> {
    const limitClamped = Math.min(Math.max(1, limit), 50);
    const range = resolveRange(period);

    const orderCol =
      orderBy === 'quantity'
        ? Prisma.sql`"totalQuantity"`
        : Prisma.sql`"totalRevenue"`;

    type RawRow = {
      productId: number | null;
      name: string;
      totalQuantity: number;
      totalRevenue: string;
    };

    const rows = await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT
        oi."productId",
        COALESCE(
          MAX(oi."productNameSnapshot"),
          '[Produto #' || COALESCE(oi."productId"::text, '?') || ']'
        )                                             AS name,
        SUM(oi.quantity)::int                         AS "totalQuantity",
        COALESCE(SUM(oi."itemTotal"), 0)              AS "totalRevenue"
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE o."restaurantId" = ${restaurantId}
        AND o."createdAt"    >= ${range.from}
        AND o."createdAt"    <= ${range.to}
        AND o."orderStatus"  != ${OrderStatus.CANCELED}::"OrderStatus"
      GROUP BY oi."productId"
      ORDER BY ${orderCol} DESC
      LIMIT ${limitClamped}
    `);

    return {
      period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      orderBy,
      limit: limitClamped,
      products: rows.map((r) => ({
        productId: r.productId,
        name: r.name,
        totalQuantity: Number(r.totalQuantity),
        totalRevenue: Math.round(Number(r.totalRevenue) * 100) / 100,
      })),
    };
  }

  async originDistribution(
    restaurantId: number,
    period: TrendPeriod = 'last_30d',
  ): Promise<OriginResponse> {
    const range = resolveRange(period);

    type RawRow = { origin: string; orders: number; revenue: string };
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        o.origin::text,
        COUNT(*)::int                      AS orders,
        COALESCE(SUM(o.total), 0)          AS revenue
      FROM "Order" o
      WHERE o."restaurantId" = ${restaurantId}
        AND o."createdAt"    >= ${range.from}
        AND o."createdAt"    <= ${range.to}
        AND o."orderStatus"  != ${OrderStatus.CANCELED}::"OrderStatus"
      GROUP BY o.origin
      ORDER BY revenue DESC
    `;

    const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);

    return {
      period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      origins: rows.map((r) => ({
        origin: r.origin,
        orders: Number(r.orders),
        revenue: Math.round(Number(r.revenue) * 100) / 100,
        percentage:
          totalRevenue > 0
            ? Math.round((Number(r.revenue) / totalRevenue) * 10000) / 100
            : 0,
      })),
    };
  }
}

export { DAY_NAMES };
