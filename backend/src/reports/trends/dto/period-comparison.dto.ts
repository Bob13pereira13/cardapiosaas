export interface PeriodRange {
  from: Date;
  to: Date;
}

export interface ComparisonCard {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface SummaryResponse {
  period: string;
  from: string;
  to: string;
  cards: {
    revenue: ComparisonCard;
    orders: ComparisonCard;
    averageTicket: ComparisonCard;
    newCustomers: ComparisonCard;
  };
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueResponse {
  granularity: string;
  period: string;
  data: RevenueDataPoint[];
  summary: {
    total: number;
    totalOrders: number;
    averageDaily: number;
  };
}

export interface TopProduct {
  productId: number | null;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface TopProductsResponse {
  period: string;
  from: string;
  to: string;
  orderBy: string;
  limit: number;
  products: TopProduct[];
}

export interface OriginDataPoint {
  origin: string;
  orders: number;
  revenue: number;
  percentage: number;
}

export interface OriginResponse {
  period: string;
  from: string;
  to: string;
  totalRevenue: number;
  origins: OriginDataPoint[];
}
