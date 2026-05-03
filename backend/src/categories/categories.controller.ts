import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() data: { nome: string }) {
    return this.categoriesService.create({
      ...data,
      userId: req.user.id,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    return this.categoriesService.findByUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() data: { nome?: string },
  ) {
    return this.categoriesService.update(Number(id), req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.categoriesService.delete(Number(id), req.user.id);
  }
}