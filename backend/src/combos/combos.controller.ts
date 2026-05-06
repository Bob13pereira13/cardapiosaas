import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CombosService } from './combos.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('combos')
@UseGuards(AuthGuard('jwt'))
export class CombosController {
  constructor(private combos: CombosService) {}

  @Get() findAll(@Request() req: AuthenticatedRequest) { return this.combos.findAll(req.user.id); }
  @Get(':id') findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.combos.findOne(req.user.id, Number(id)); }
  @Post() create(@Request() req: AuthenticatedRequest, @Body() body: { nome: string; descricao?: string; preco: number; imagemUrl?: string; ativo?: boolean }) { return this.combos.create(req.user.id, body); }
  @Patch(':id') update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { nome?: string; descricao?: string; preco?: number; imagemUrl?: string; ativo?: boolean }) { return this.combos.update(req.user.id, Number(id), body); }
  @Delete(':id') remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.combos.remove(req.user.id, Number(id)); }

  @Post(':id/items') addItem(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { productId: number; quantidade?: number }) { return this.combos.addItem(req.user.id, Number(id), body); }
  @Delete(':id/items/:itemId') removeItem(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Param('itemId') itemId: string) { return this.combos.removeItem(req.user.id, Number(id), Number(itemId)); }
}
