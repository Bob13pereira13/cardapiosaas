import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    activeRestaurantId: number;
    isPlatformAdmin?: boolean;
  };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('subscription/:restaurantId')
  @UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
  createSubscription(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateSubscriptionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.billingService.createSubscription(
      Number(restaurantId),
      dto,
      {
        id: req.user.activeRestaurantId,
        isPlatformAdmin: req.user.isPlatformAdmin,
      },
      this.getRemoteIp(req),
    );
  }

  @Post('webhook/asaas')
  handleAsaasWebhook(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: unknown,
  ) {
    return this.billingService.handleAsaasWebhook(
      token,
      body as Parameters<BillingService['handleAsaasWebhook']>[1],
    );
  }

  private getRemoteIp(req: AuthenticatedRequest) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return raw?.split(',')[0]?.trim() || req.ip;
  }
}
