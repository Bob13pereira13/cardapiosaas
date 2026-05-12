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
import { CombosService } from './combos.service';

type AuthReq = { user: { id: number; activeRestaurantId: number } };

@Controller('combos')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CombosController {
  constructor(private combos: CombosService) {}

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.combos.findAll(req.user.activeRestaurantId);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.combos.findOne(req.user.activeRestaurantId, Number(id));
  }

  @Post()
  create(
    @Request() req: AuthReq,
    @Body()
    body: {
      nome: string;
      descricao?: string;
      preco: number;
      imagemUrl?: string;
      ativo?: boolean;
    },
  ) {
    return this.combos.create(req.user.activeRestaurantId, body);
  }

  @Patch(':id')
  update(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body()
    body: {
      nome?: string;
      descricao?: string;
      preco?: number;
      imagemUrl?: string;
      ativo?: boolean;
    },
  ) {
    return this.combos.update(req.user.activeRestaurantId, Number(id), body);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.combos.remove(req.user.activeRestaurantId, Number(id));
  }

  @Post(':id/items')
  addItem(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() body: { productId: number; quantidade?: number },
  ) {
    return this.combos.addItem(req.user.activeRestaurantId, Number(id), body);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.combos.removeItem(
      req.user.activeRestaurantId,
      Number(id),
      Number(itemId),
    );
  }
}
