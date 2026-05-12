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
import { CampaignsService } from './campaigns.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get() findAll(@Request() req: AuthenticatedRequest) {
    return this.campaigns.findAll(req.user.activeRestaurantId);
  }
  @Get(':id') findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.campaigns.findOne(req.user.activeRestaurantId, Number(id));
  }

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      nome: string;
      tipo?: string;
      descricao?: string;
      couponId?: number;
    },
  ) {
    return this.campaigns.create(req.user.activeRestaurantId, body);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      nome?: string;
      tipo?: string;
      status?: string;
      descricao?: string;
      couponId?: number;
    },
  ) {
    return this.campaigns.update(req.user.activeRestaurantId, Number(id), body);
  }

  @Delete(':id') remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.campaigns.remove(req.user.activeRestaurantId, Number(id));
  }

  @Post(':id/activate') activate(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.campaigns.activate(req.user.activeRestaurantId, Number(id));
  }
  @Post(':id/pause') pause(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.campaigns.pause(req.user.activeRestaurantId, Number(id));
  }
}
