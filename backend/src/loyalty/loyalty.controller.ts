import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoyaltyService } from './loyalty.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('loyalty')
@UseGuards(AuthGuard('jwt'))
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  @Get('settings')
  getSettings(@Request() req: AuthenticatedRequest) {
    return this.loyalty.getSettings(req.user.id);
  }

  @Patch('settings')
  updateSettings(
    @Request() req: AuthenticatedRequest,
    @Body() body: { loyaltyEnabled?: boolean; loyaltyPointsPerBrl?: number; loyaltyRedeemRate?: number },
  ) {
    return this.loyalty.updateSettings(req.user.id, body);
  }

  @Get('customers/:customerId')
  getCustomerPoints(
    @Param('customerId') customerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.loyalty.getCustomerPoints(req.user.id, Number(customerId));
  }
}
