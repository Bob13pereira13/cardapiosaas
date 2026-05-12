import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { FiadoService } from '../fiado/fiado.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

interface ScopedRequest extends Request {
  user: {
    id: number;
    accountId?: number;
    activeRestaurantId: number;
    role?: string | null;
  };
}

@Controller('restaurants')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly fiadoService: FiadoService,
  ) {}

  @Get('me')
  getMe(@Req() req: ScopedRequest) {
    return this.restaurantsService.findMe(req.user.activeRestaurantId);
  }

  @Patch('me')
  updateMe(@Req() req: ScopedRequest, @Body() body: UpdateRestaurantDto) {
    return this.restaurantsService.updateMe(req.user.activeRestaurantId, body);
  }

  @Get('me/fiado-summary')
  getFiadoSummary(@Req() req: ScopedRequest) {
    return this.fiadoService.getFiadoSummary(
      req.user.activeRestaurantId,
      req.user.role ?? null,
    );
  }
}
