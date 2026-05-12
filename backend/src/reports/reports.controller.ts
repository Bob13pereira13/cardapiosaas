import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};
type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

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
}
