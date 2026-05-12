import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { ProductionSectorsService } from './production-sectors.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('production-sectors')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ProductionSectorsController {
  constructor(private service: ProductionSectorsService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.activeRestaurantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.activeRestaurantId);
  }

  @Post()
  create(
    @Body() body: { nome: string; cor?: string; ordem?: number },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(body, req.user.activeRestaurantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { nome?: string; cor?: string; ordem?: number; ativo?: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.update(id, body, req.user.activeRestaurantId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.remove(id, req.user.activeRestaurantId);
  }
}
