import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('logs')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('action') action?: string,
    @Query('skip') skip?: string,
  ) {
    return this.audit.findAll(req.user.id, { action, skip: skip ? Number(skip) : 0 });
  }
}
