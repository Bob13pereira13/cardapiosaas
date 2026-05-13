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
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../../auth/restaurant-scope.guard';
import { CreateTriggerSubscriptionDto } from './dto/create-trigger-subscription.dto';
import { UpdateTriggerSubscriptionDto } from './dto/update-trigger-subscription.dto';
import { TriggerSubscriptionsService } from './trigger-subscriptions.service';

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
      'Apenas OWNER ou MANAGER podem gerenciar trigger subscriptions.',
    );
  }
}

@Controller()
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class TriggerSubscriptionsController {
  constructor(private readonly service: TriggerSubscriptionsService) {}

  // POST /campaigns/:id/subscribe-trigger
  @Post('campaigns/:id/subscribe-trigger')
  subscribeTrigger(
    @Param('id', ParseIntPipe) campaignId: number,
    @Body() dto: CreateTriggerSubscriptionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.create(
      campaignId,
      dto,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  // GET /trigger-subscriptions?campaignId=X
  @Get('trigger-subscriptions')
  findAll(
    @Query('campaignId') campaignId: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    const cid = campaignId !== undefined ? parseInt(campaignId, 10) : undefined;
    return this.service.findAll(req.user.activeRestaurantId, cid);
  }

  // GET /trigger-subscriptions/:id
  @Get('trigger-subscriptions/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.activeRestaurantId);
  }

  // PATCH /trigger-subscriptions/:id
  @Patch('trigger-subscriptions/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTriggerSubscriptionDto,
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

  // DELETE /trigger-subscriptions/:id
  @Delete('trigger-subscriptions/:id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.remove(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  // POST /trigger-subscriptions/:id/run-now
  @Post('trigger-subscriptions/:id/run-now')
  runNow(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.runNow(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }
}
