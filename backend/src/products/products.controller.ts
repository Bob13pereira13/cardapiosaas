import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 🔓 ROTA PÚBLICA (SEM LOGIN)
  @Get('public/:userId')
  findPublic(@Param('userId') userId: string) {
    return this.productsService.findByUser(Number(userId));
  }

  // 🔒 PROTEGIDO
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Request() req,
    @Body()
    data: {
      nome: string;
      preco: number;
      imagem?: string;
      categoryId?: number;
    },
  ) {
    return this.productsService.create({
      ...data,
      userId: req.user.id,
    });
  }

  // 🔒 PROTEGIDO
  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    return this.productsService.findByUser(req.user.id);
  }

  // 🔒 PROTEGIDO
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body()
    data: {
      nome?: string;
      preco?: number;
      imagem?: string;
      categoryId?: number;
    },
  ) {
    return this.productsService.update(Number(id), req.user.id, data);
  }

  // 🔒 PROTEGIDO
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.productsService.delete(Number(id), req.user.id);
  }
}