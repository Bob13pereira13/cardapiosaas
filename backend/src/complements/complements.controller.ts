import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { ComplementsService } from './complements.service';
import { CreateComplementDto } from './dto/create-complement.dto';
import { UpdateComplementDto } from './dto/update-complement.dto';
import { ListComplementsDto } from './dto/list-complements.dto';
import { AddOptionToComplementDto } from './dto/add-option-to-complement.dto';
import { UpdateComplementOptionDto } from './dto/update-complement-option.dto';
import { ReorderComplementOptionsDto } from './dto/reorder-complement-options.dto';

type AuthenticatedRequest = {
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

function requireWriteRole(req: AuthenticatedRequest): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER ou MANAGER podem gerenciar complementos.',
    );
  }
}

@Controller('complements')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class ComplementsController {
  constructor(private readonly service: ComplementsService) {}

  @Get()
  list(@Query() dto: ListComplementsDto, @Request() req: AuthenticatedRequest) {
    return this.service.list(req.user.activeRestaurantId, dto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(req.user.activeRestaurantId, id);
  }

  @Post()
  create(
    @Body() dto: CreateComplementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.create(req.user.activeRestaurantId, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.update(req.user.activeRestaurantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.softDelete(req.user.activeRestaurantId, id);
  }

  @Post(':id/options')
  addOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOptionToComplementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.addOption(req.user.activeRestaurantId, id, dto);
  }

  @Delete(':id/options/:optionId')
  @HttpCode(HttpStatus.OK)
  removeOption(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.removeOption(req.user.activeRestaurantId, id, optionId);
  }

  @Patch(':id/options/:optionId')
  updateComplementOption(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() dto: UpdateComplementOptionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.updateComplementOption(
      req.user.activeRestaurantId,
      id,
      optionId,
      dto,
    );
  }

  @Post(':id/reorder-options')
  @HttpCode(HttpStatus.OK)
  reorderOptions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderComplementOptionsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.reorderOptions(req.user.activeRestaurantId, id, dto);
  }
}
