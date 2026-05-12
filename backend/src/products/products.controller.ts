import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginateProductsDto } from './dto/paginate-products.dto';

type AuthReq = {
  user: { id: number; accountId: number; activeRestaurantId: number };
};

@Controller('products')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() data: CreateProductDto) {
    return this.productsService.create({
      ...data,
      restaurantId: req.user.activeRestaurantId,
      accountId: req.user.accountId,
    });
  }

  @Get()
  findAll(@Request() req: AuthReq, @Query() query: PaginateProductsDto) {
    return this.productsService.findByRestaurant(
      req.user.activeRestaurantId,
      query.page,
      query.limit,
    );
  }

  @Patch('reorder')
  reorder(@Request() req: AuthReq, @Body() body: { ids: number[] }) {
    return this.productsService.reorder(req.user.activeRestaurantId, body.ids);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req: AuthReq) {
    return this.productsService.duplicate(
      Number(id),
      req.user.activeRestaurantId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthReq,
    @Body() data: UpdateProductDto,
  ) {
    return this.productsService.update(
      Number(id),
      req.user.activeRestaurantId,
      data,
    );
  }

  @Put(':id/availability')
  replaceAvailability(
    @Param('id') id: string,
    @Request() req: AuthReq,
    @Body()
    body: {
      slots: { dayOfWeek: number; startTime: string; endTime: string }[];
    },
  ) {
    return this.productsService.replaceAvailability(
      Number(id),
      req.user.activeRestaurantId,
      body.slots ?? [],
    );
  }

  @Post(':id/complementos/:complementoId')
  linkComplemento(
    @Param('id') id: string,
    @Param('complementoId') complementoId: string,
    @Request() req: AuthReq,
    @Body() body: { ordem?: number },
  ) {
    return this.productsService.linkComplemento(
      Number(id),
      Number(complementoId),
      req.user.activeRestaurantId,
      body.ordem,
    );
  }

  @Delete(':id/complementos/:complementoId')
  unlinkComplemento(
    @Param('id') id: string,
    @Param('complementoId') complementoId: string,
    @Request() req: AuthReq,
  ) {
    return this.productsService.unlinkComplemento(
      Number(id),
      Number(complementoId),
      req.user.activeRestaurantId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthReq) {
    return this.productsService.delete(
      Number(id),
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }
}
