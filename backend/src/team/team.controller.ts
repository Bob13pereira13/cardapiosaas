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
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { TeamService } from './team.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.team.findAll(req.user.activeRestaurantId);
  }

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      nome: string;
      email: string;
      senha?: string;
      password?: string;
      role?: MembershipRole;
    },
  ) {
    return this.team.create(req.user.activeRestaurantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { role?: MembershipRole },
  ) {
    return this.team.update(req.user.activeRestaurantId, Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.team.remove(req.user.activeRestaurantId, Number(id));
  }
}
