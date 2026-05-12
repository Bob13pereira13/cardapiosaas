import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { NpsService } from './nps.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};
type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

@Controller('nps')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class NpsController {
  constructor(private nps: NpsService) {}

  @Get('summary')
  getSummary(@Request() req: AuthenticatedRequest) {
    return this.nps.getSummary(req.user.activeRestaurantId);
  }

  @Get('responses')
  getResponses(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: Period = 'MONTH',
    @Query('score') score?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.nps.getResponses(req.user.activeRestaurantId, {
      period,
      score: score ? Number(score) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Patch('responses/:id/reply')
  reply(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reply: string },
  ) {
    return this.nps.reply(req.user.activeRestaurantId, Number(id), body.reply);
  }
}
