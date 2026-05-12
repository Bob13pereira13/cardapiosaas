import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { AgendaService } from './agenda.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('agenda')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class AgendaController {
  constructor(private agenda: AgendaService) {}

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('dataHoraFrom') dataHoraFrom?: string,
    @Query('dataHoraTo') dataHoraTo?: string,
    @Query('status') status?: string,
  ) {
    return this.agenda.findAll(req.user.activeRestaurantId, {
      dataHoraFrom,
      dataHoraTo,
      status,
    });
  }

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      dataHora: string;
      tipo?: string;
      descricao?: string;
      obs?: string;
      customerId?: number;
      total?: number;
    },
  ) {
    return this.agenda.create(req.user.activeRestaurantId, body);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      dataHora?: string;
      tipo?: string;
      status?: string;
      descricao?: string;
      obs?: string;
      customerId?: number;
      total?: number;
    },
  ) {
    return this.agenda.update(req.user.activeRestaurantId, Number(id), body);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.agenda.remove(req.user.activeRestaurantId, Number(id));
  }
}
