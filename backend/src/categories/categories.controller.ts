import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type AuthReq = { user: { id: number; activeRestaurantId: number } };

@Controller('categories')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() data: CreateCategoryDto) {
    return this.categoriesService.create({
      ...data,
      restaurantId: req.user.activeRestaurantId,
    });
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.categoriesService.findByRestaurant(req.user.activeRestaurantId);
  }

  @Patch('reorder')
  reorder(@Request() req: AuthReq, @Body() body: { ids: number[] }) {
    return this.categoriesService.reorder(
      req.user.activeRestaurantId,
      body.ids,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthReq,
    @Body() data: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      Number(id),
      req.user.activeRestaurantId,
      data,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthReq) {
    return this.categoriesService.delete(
      Number(id),
      req.user.activeRestaurantId,
    );
  }
}
