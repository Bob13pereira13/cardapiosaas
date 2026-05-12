import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SelectRestaurantDto } from './dto/select-restaurant.dto';

interface AuthenticatedRequest extends Request {
  user: { accountId: number; activeRestaurantId?: number; role?: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('select-restaurant')
  selectRestaurant(
    @Req() req: AuthenticatedRequest,
    @Body() body: SelectRestaurantDto,
  ) {
    return this.authService.selectRestaurant(
      req.user.accountId,
      body.restaurantPublicId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('memberships')
  getMemberships(@Req() req: AuthenticatedRequest) {
    return this.authService.getMemberships(req.user.accountId);
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('forgot-password')
  forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data.email);
  }

  @Post('reset-password')
  resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data.token, data.password);
  }
}
