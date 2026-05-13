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
  ForbiddenException,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginateProductsDto } from './dto/paginate-products.dto';
import { AddComplementToProductDto } from './dto/add-complement-to-product.dto';
import { ReorderProductComplementsDto } from './dto/reorder-product-complements.dto';
import { BatchUpdateProductsDto } from './dto/batch-update-products.dto';

type AuthReq = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: MembershipRole;
    isPlatformAdmin?: boolean;
  };
};

const WRITE_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

function requireWriteRole(req: AuthReq): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER ou MANAGER podem realizar esta operação.',
    );
  }
}

@Controller('products')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() data: CreateProductDto) {
    return this.productsService.create(
      req.user.activeRestaurantId,
      req.user.accountId,
      data,
    );
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

  @Post('batch-update')
  @HttpCode(HttpStatus.OK)
  batchUpdate(@Request() req: AuthReq, @Body() dto: BatchUpdateProductsDto) {
    requireWriteRole(req);
    return this.productsService.batchUpdate(req.user.activeRestaurantId, dto);
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
      req.user.activeRestaurantId,
      Number(id),
      data,
      req.user.accountId,
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

  // ── complement relationship endpoints ──

  @Post(':id/complements')
  addComplement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddComplementToProductDto,
    @Request() req: AuthReq,
  ) {
    requireWriteRole(req);
    return this.productsService.addComplement(
      req.user.activeRestaurantId,
      id,
      dto,
    );
  }

  @Delete(':id/complements/:complementId')
  @HttpCode(HttpStatus.OK)
  removeComplement(
    @Param('id', ParseIntPipe) id: number,
    @Param('complementId', ParseIntPipe) complementId: number,
    @Request() req: AuthReq,
  ) {
    requireWriteRole(req);
    return this.productsService.removeComplement(
      req.user.activeRestaurantId,
      id,
      complementId,
    );
  }

  @Post(':id/reorder-complements')
  @HttpCode(HttpStatus.OK)
  reorderComplements(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderProductComplementsDto,
    @Request() req: AuthReq,
  ) {
    requireWriteRole(req);
    return this.productsService.reorderComplements(
      req.user.activeRestaurantId,
      id,
      dto,
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
