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
import { BillingService } from './billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

type AuthenticatedRequest = { user: { id: number; role?: string } };
type RequestWithIp = AuthenticatedRequest & {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('subscription/:userId')
  @UseGuards(AuthGuard('jwt'))
  createSubscription(
    @Param('userId') userId: string,
    @Body() dto: CreateSubscriptionDto,
    @Request() req: RequestWithIp,
  ) {
    return this.billingService.createSubscription(
      Number(userId),
      dto,
      req.user,
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

  private getRemoteIp(req: RequestWithIp) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return raw?.split(',')[0]?.trim() || req.ip;
  }
}
