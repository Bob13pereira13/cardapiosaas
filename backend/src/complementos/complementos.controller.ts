import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ComplementosService } from './complementos.service';

type AuthenticatedRequest = { user: { id: number } };

export class BaseComplementosController {
  constructor(protected readonly service: ComplementosService) {}
}

@Controller('complementos')
@UseGuards(AuthGuard('jwt'))
export class ComplementosController extends BaseComplementosController {
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findComplementos(req.user.id);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() body: { nome: string }) {
    return this.service.createComplemento(req.user.id, body);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getComplemento(req.user.id, Number(id));
  }

  @Patch(':id')
  update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateComplemento(req.user.id, Number(id), body);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.deleteComplemento(req.user.id, Number(id));
  }

  @Patch(':id/toggle')
  toggle(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.toggleComplemento(req.user.id, Number(id));
  }
}

@Controller('opcoes')
@UseGuards(AuthGuard('jwt'))
export class OpcoesController extends BaseComplementosController {
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findOpcoes(req.user.id);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() body: { complementoId: number; nome: string }) {
    return this.service.createOpcao(req.user.id, body);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getOpcao(req.user.id, Number(id));
  }

  @Patch(':id')
  update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateOpcao(req.user.id, Number(id), body);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.deleteOpcao(req.user.id, Number(id));
  }

  @Patch(':id/toggle')
  toggle(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.toggleOpcao(req.user.id, Number(id));
  }
}
