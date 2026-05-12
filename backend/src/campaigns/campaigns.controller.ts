import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampaignStatus, MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { CampaignsService } from './campaigns.service';
import { DispatchService } from './dispatch/dispatch.service';
import { CampaignSchedulerService } from './scheduling/campaign-scheduler.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: MembershipRole;
    isPlatformAdmin?: boolean;
  };
};

const WRITE_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

function requireWriteRole(req: AuthenticatedRequest): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER ou MANAGER podem gerenciar campanhas.',
    );
  }
}

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CampaignsController {
  constructor(
    private readonly service: CampaignsService,
    private readonly dispatch: DispatchService,
    private readonly scheduler: CampaignSchedulerService,
  ) {}

  @Post()
  create(@Body() dto: CreateCampaignDto, @Request() req: AuthenticatedRequest) {
    requireWriteRole(req);
    return this.service.create(
      dto,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: CampaignStatus,
  ) {
    return this.service.findAll(
      req.user.activeRestaurantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.activeRestaurantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.update(
      id,
      dto,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.delete(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  send(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.dispatch.send(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Patch(':id/cancel-schedule')
  cancelSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.cancelSchedule(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  // Debug/testing endpoint — triggers the @Cron scheduler synchronously.
  // In production only the @Cron decorator calls processScheduledCampaigns().
  @Post('scheduler/run')
  @HttpCode(HttpStatus.OK)
  runScheduler(@Request() req: AuthenticatedRequest) {
    requireWriteRole(req);
    return this.scheduler.processScheduledCampaigns();
  }

  @Get(':id/report')
  getReport(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getCampaignReport(id, req.user.activeRestaurantId);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dispatch.getMessages(
      id,
      req.user.activeRestaurantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
