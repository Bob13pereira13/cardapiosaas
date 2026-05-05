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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type AuthenticatedRequest = { user: { id: number } };

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() data: CreateCategoryDto,
  ) {
    return this.categoriesService.create({ ...data, userId: req.user.id });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.categoriesService.findByUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() data: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(Number(id), req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.categoriesService.delete(Number(id), req.user.id);
  }
}
