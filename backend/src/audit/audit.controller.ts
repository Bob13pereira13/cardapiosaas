import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { AuditService } from './audit.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('logs')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('action') action?: string,
    @Query('skip') skip?: string,
  ) {
    return this.audit.findAll(req.user.activeRestaurantId, {
      action,
      skip: skip ? Number(skip) : 0,
    });
  }
}
