import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { LoyaltyService } from './loyalty.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('loyalty')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  @Get('settings')
  getSettings(@Request() req: AuthenticatedRequest) {
    return this.loyalty.getSettings(req.user.activeRestaurantId);
  }

  @Patch('settings')
  updateSettings(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      loyaltyEnabled?: boolean;
      loyaltyPointsPerBrl?: number;
      loyaltyRedeemRate?: number;
    },
  ) {
    return this.loyalty.updateSettings(req.user.activeRestaurantId, body);
  }

  @Get('customers/:customerId')
  getCustomerPoints(
    @Param('customerId') customerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.loyalty.getCustomerPoints(
      req.user.activeRestaurantId,
      Number(customerId),
    );
  }

  @Get('overview')
  getOverview(@Request() req: AuthenticatedRequest) {
    return this.loyalty.getOverview(req.user.activeRestaurantId);
  }

  @Get('top-customers')
  getTopCustomers(@Request() req: AuthenticatedRequest) {
    return this.loyalty.getTopCustomers(req.user.activeRestaurantId);
  }

  @Post('redeem')
  redeemForCoupon(
    @Request() req: AuthenticatedRequest,
    @Body() body: { customerId: number; points: number },
  ) {
    return this.loyalty.redeemForCoupon(
      req.user.activeRestaurantId,
      body.customerId,
      body.points,
    );
  }
}
