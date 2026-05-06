import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerGuard } from './customer.guard';

class RequestPinDto {
  @IsString() @IsNotEmpty() phone: string;
  @IsNotEmpty() userId: number;
}

class VerifyPinDto {
  @IsString() @IsNotEmpty() phone: string;
  @IsNotEmpty() userId: number;
  @IsString() @IsNotEmpty() pin: string;
}

type CustomerRequest = Request & { customer: { sub: number; userId: number } };

@Controller('customer')
export class CustomerAuthController {
  constructor(private svc: CustomerAuthService) {}

  @Post('auth/request-pin')
  requestPin(@Body() dto: RequestPinDto) {
    return this.svc.requestPin(dto.phone, Number(dto.userId));
  }

  @Post('auth/verify-pin')
  verifyPin(@Body() dto: VerifyPinDto) {
    return this.svc.verifyPin(dto.phone, Number(dto.userId), dto.pin);
  }

  @UseGuards(CustomerGuard)
  @Get('me')
  getMe(@Request() req: CustomerRequest) {
    return this.svc.getMe(req.customer.sub, req.customer.userId);
  }

  @UseGuards(CustomerGuard)
  @Get('orders')
  getOrders(@Request() req: CustomerRequest) {
    return this.svc.getOrders(req.customer.sub, req.customer.userId);
  }
}
