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
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: MembershipRole;
    isPlatformAdmin: boolean;
  };
};

// Roles com permissão de escrita (criação/edição/exclusão de zonas)
const WRITE_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

function requireWriteRole(req: AuthenticatedRequest): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER ou MANAGER podem gerenciar zonas de entrega',
    );
  }
}

@Controller('delivery-zones')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class DeliveryZonesController {
  constructor(private readonly zones: DeliveryZonesService) {}

  // GET — qualquer role autenticada do restaurant
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.zones.findAll(req.user.activeRestaurantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.zones.findOne(id, req.user.activeRestaurantId);
  }

  // POST/PATCH/DELETE — apenas OWNER ou MANAGER
  @Post()
  create(
    @Body() dto: CreateDeliveryZoneDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.zones.create(
      req.user.activeRestaurantId,
      dto,
      req.user.accountId,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryZoneDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.zones.update(
      id,
      dto,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.zones.remove(
      id,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }
}
