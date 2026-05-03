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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('public/:userId')
  findPublic(@Param('userId') userId: string) {
    return this.productsService.findByUser(Number(userId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() data: CreateProductDto) {
    return this.productsService.create({ ...data, userId: req.user.id });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    return this.productsService.findByUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() data: UpdateProductDto) {
    return this.productsService.update(Number(id), req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.productsService.delete(Number(id), req.user.id);
  }
}
