import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { DeliveryAttemptsService } from './delivery-attempts.service';
import { CreateDeliveryAttemptDto } from './dto/create-delivery-attempt.dto';
import { UpdateAttemptStatusDto } from './dto/update-attempt-status.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: MembershipRole;
    isPlatformAdmin: boolean;
  };
};

const WRITE_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
  MembershipRole.CASHIER,
];

function requireWriteRole(req: AuthenticatedRequest): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER, MANAGER ou CASHIER podem gerenciar tentativas de entrega',
    );
  }
}

@Controller('orders/:orderId/delivery-attempts')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class OrderDeliveryAttemptsController {
  constructor(private readonly attempts: DeliveryAttemptsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateDeliveryAttemptDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.attempts.create(
      req.user.activeRestaurantId,
      orderId,
      dto,
      req.user.accountId,
    );
  }

  @Get()
  findByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attempts.findByOrder(req.user.activeRestaurantId, orderId);
  }
}

@Controller('delivery-attempts')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class DeliveryAttemptsController {
  constructor(private readonly attempts: DeliveryAttemptsService) {}

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attempts.findOne(id, req.user.activeRestaurantId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttemptStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.attempts.updateStatus(
      id,
      req.user.activeRestaurantId,
      dto,
      req.user.accountId,
    );
  }

  @Post(':id/retry')
  retry(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.attempts.retry(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }
}
