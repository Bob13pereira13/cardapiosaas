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
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginateProductsDto } from './dto/paginate-products.dto';

type AuthenticatedRequest = { user: { id: number } };

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() data: CreateProductDto) {
    return this.productsService.create({ ...data, userId: req.user.id });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: PaginateProductsDto,
  ) {
    return this.productsService.findByUser(
      req.user.id,
      query.page,
      query.limit,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('reorder')
  reorder(
    @Request() req: AuthenticatedRequest,
    @Body() body: { ids: number[] },
  ) {
    return this.productsService.reorder(req.user.id, body.ids);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.productsService.duplicate(Number(id), req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() data: UpdateProductDto,
  ) {
    return this.productsService.update(Number(id), req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.productsService.delete(Number(id), req.user.id);
  }
}
