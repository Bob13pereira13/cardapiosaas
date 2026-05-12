import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('coupons')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.coupons.findAll(req.user.activeRestaurantId);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateCouponDto) {
    return this.coupons.create(req.user.activeRestaurantId, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.coupons.toggle(Number(id), req.user.activeRestaurantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.coupons.remove(Number(id), req.user.activeRestaurantId);
  }
}
