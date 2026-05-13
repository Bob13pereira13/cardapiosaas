import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { ReportsService } from './reports.service';
import type { Granularity, TrendPeriod } from './trends/dto/trend-query.dto';
import { TrendsService } from './trends/trends.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};
type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const SUMMARY_PERIODS = [
  'current_month',
  'current_week',
  'current_year',
] as const;
type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];

const VALID_GRANULARITIES: Granularity[] = ['day', 'month'];
const HEATMAP_PERIODS: TrendPeriod[] = ['last_7d', 'last_30d', 'last_90d'];
const ALL_TREND_PERIODS: TrendPeriod[] = [
  'current_month',
  'current_week',
  'current_year',
  'last_7d',
  'last_30d',
  'last_90d',
  'last_12m',
  'last_24m',
];

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly trends: TrendsService,
  ) {}

  // ─── Legacy snapshot endpoints ───

  @Get('summary')
  summary(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: Period = 'TODAY',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.summary(req.user.activeRestaurantId, {
      period,
      dateFrom,
      dateTo,
    });
  }

  @Get('abc')
  abcCurve(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: Period = 'MONTH',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.getAbcCurve(req.user.activeRestaurantId, {
      period,
      dateFrom,
      dateTo,
    });
  }

  @Get('customer-ltv')
  customerLtv(@Request() req: AuthenticatedRequest) {
    return this.reports.getCustomerLtv(req.user.activeRestaurantId);
  }

  @Get('revenue-by-hour')
  revenueByHour(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: Period = 'MONTH',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.getRevenueByHour(req.user.activeRestaurantId, {
      period,
      dateFrom,
      dateTo,
    });
  }

  @Get('churn-signals')
  churnSignals(@Request() req: AuthenticatedRequest) {
    return this.reports.getChurnSignals(req.user.activeRestaurantId);
  }

  // ─── Trends endpoints (Etapa 11) ───

  @Get('trends/summary')
  @UseInterceptors(CacheInterceptor)
  trendsSummary(
    @Request() req: AuthenticatedRequest,
    @Query('period') period?: string,
  ) {
    const p = (period ?? 'current_month') as SummaryPeriod;
    if (!SUMMARY_PERIODS.includes(p)) {
      throw new BadRequestException(
        `period inválido. Use: ${SUMMARY_PERIODS.join(', ')}`,
      );
    }
    return this.trends.summary(req.user.activeRestaurantId, p);
  }

  @Get('trends/revenue')
  @UseInterceptors(CacheInterceptor)
  trendsRevenue(
    @Request() req: AuthenticatedRequest,
    @Query('granularity') granularity?: string,
    @Query('period') period?: string,
  ) {
    const g = (granularity ?? 'day') as Granularity;
    const p = (period ?? 'last_30d') as TrendPeriod;

    if (!VALID_GRANULARITIES.includes(g)) {
      throw new BadRequestException(`granularity inválido. Use: day, month`);
    }
    if (!ALL_TREND_PERIODS.includes(p)) {
      throw new BadRequestException(
        `period inválido. Use: ${ALL_TREND_PERIODS.join(', ')}`,
      );
    }

    return this.trends.revenue(req.user.activeRestaurantId, g, p);
  }

  @Get('trends/products/top')
  @UseInterceptors(CacheInterceptor)
  trendsTopProducts(
    @Request() req: AuthenticatedRequest,
    @Query('period') period?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    const p = (period ?? 'last_30d') as TrendPeriod;
    if (!ALL_TREND_PERIODS.includes(p)) {
      throw new BadRequestException(
        `period inválido. Use: ${ALL_TREND_PERIODS.join(', ')}`,
      );
    }
    const l = Math.min(Math.max(1, parseInt(limit ?? '10', 10) || 10), 50);
    const ob: 'revenue' | 'quantity' =
      orderBy === 'quantity' ? 'quantity' : 'revenue';
    return this.trends.topProducts(req.user.activeRestaurantId, p, l, ob);
  }

  @Get('trends/origin')
  @UseInterceptors(CacheInterceptor)
  trendsOrigin(
    @Request() req: AuthenticatedRequest,
    @Query('period') period?: string,
  ) {
    const p = (period ?? 'last_30d') as TrendPeriod;
    if (!ALL_TREND_PERIODS.includes(p)) {
      throw new BadRequestException(
        `period inválido. Use: ${ALL_TREND_PERIODS.join(', ')}`,
      );
    }
    return this.trends.originDistribution(req.user.activeRestaurantId, p);
  }

  @Get('trends/heatmap')
  @UseInterceptors(CacheInterceptor)
  trendsHeatmap(
    @Request() req: AuthenticatedRequest,
    @Query('period') period?: string,
  ) {
    const p = (period ?? 'last_30d') as 'last_7d' | 'last_30d' | 'last_90d';
    if (!HEATMAP_PERIODS.includes(p)) {
      throw new BadRequestException(
        `period inválido para heatmap. Use: last_7d, last_30d, last_90d`,
      );
    }
    return this.trends.heatmap(req.user.activeRestaurantId, p);
  }
}
