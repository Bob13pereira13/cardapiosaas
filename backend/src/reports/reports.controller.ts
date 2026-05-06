import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = { user: { id: number } };
type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: Period = 'TODAY',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.summary(req.user.id, { period, dateFrom, dateTo });
  }
}
