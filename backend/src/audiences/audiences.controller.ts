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
import { AudiencesService } from './audiences.service';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';

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
      'Apenas OWNER ou MANAGER podem gerenciar públicos.',
    );
  }
}

@Controller('audiences')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class AudiencesController {
  constructor(private readonly service: AudiencesService) {}

  @Post()
  create(@Body() dto: CreateAudienceDto, @Request() req: AuthenticatedRequest) {
    requireWriteRole(req);
    return this.service.create(
      dto,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      req.user.activeRestaurantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.activeRestaurantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAudienceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.update(
      id,
      dto,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.delete(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Get(':id/preview')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.preview(id, req.user.activeRestaurantId);
  }

  @Post(':id/recalculate-size')
  @HttpCode(HttpStatus.OK)
  recalculateSize(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.recalculateSize(id, req.user.activeRestaurantId);
  }
}
