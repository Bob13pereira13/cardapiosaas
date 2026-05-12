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
import { ComplementosService } from './complementos.service';

type AuthReq = { user: { id: number; activeRestaurantId: number } };

export class BaseComplementosController {
  constructor(protected readonly service: ComplementosService) {}
}

@Controller('complementos')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ComplementosController extends BaseComplementosController {
  @Get()
  findAll(@Request() req: AuthReq) {
    return this.service.findComplementos(req.user.activeRestaurantId);
  }

  @Post()
  create(@Request() req: AuthReq, @Body() body: { nome: string }) {
    return this.service.createComplemento(req.user.activeRestaurantId, body);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.service.getComplemento(req.user.activeRestaurantId, Number(id));
  }

  @Patch(':id')
  update(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateComplemento(
      req.user.activeRestaurantId,
      Number(id),
      body,
    );
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.service.deleteComplemento(
      req.user.activeRestaurantId,
      Number(id),
    );
  }

  @Patch(':id/toggle')
  toggle(@Request() req: AuthReq, @Param('id') id: string) {
    return this.service.toggleComplemento(
      req.user.activeRestaurantId,
      Number(id),
    );
  }
}

@Controller('opcoes')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class OpcoesController extends BaseComplementosController {
  @Get()
  findAll(@Request() req: AuthReq) {
    return this.service.findOpcoes(req.user.activeRestaurantId);
  }

  @Post()
  create(
    @Request() req: AuthReq,
    @Body() body: { complementoId: number; nome: string },
  ) {
    return this.service.createOpcao(req.user.activeRestaurantId, body);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.service.getOpcao(req.user.activeRestaurantId, Number(id));
  }

  @Patch(':id')
  update(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateOpcao(
      req.user.activeRestaurantId,
      Number(id),
      body,
    );
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.service.deleteOpcao(req.user.activeRestaurantId, Number(id));
  }

  @Patch(':id/toggle')
  toggle(@Request() req: AuthReq, @Param('id') id: string) {
    return this.service.toggleOpcao(req.user.activeRestaurantId, Number(id));
  }
}
