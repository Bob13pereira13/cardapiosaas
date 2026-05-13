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
