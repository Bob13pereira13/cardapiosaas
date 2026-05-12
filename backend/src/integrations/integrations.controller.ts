import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { IntegrationsService } from './integrations.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('integrations')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Get()
  getSettings(@Request() req: AuthenticatedRequest) {
    return this.integrations.getSettings(req.user.activeRestaurantId);
  }

  @Patch()
  updateSettings(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      gtmId?: string;
      ga4MeasurementId?: string;
      metaPixelId?: string;
      metaAccessToken?: string;
    },
  ) {
    return this.integrations.updateSettings(req.user.activeRestaurantId, body);
  }
}
