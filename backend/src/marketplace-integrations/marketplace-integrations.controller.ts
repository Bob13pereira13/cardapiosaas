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
import { MarketplaceIntegrationsService } from './marketplace-integrations.service';
import { CreateMarketplaceIntegrationDto } from './dto/create-marketplace-integration.dto';
import { UpdateMarketplaceIntegrationDto } from './dto/update-marketplace-integration.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: MembershipRole;
    isPlatformAdmin: boolean;
  };
};

const WRITE_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

function requireWriteRole(req: AuthenticatedRequest): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER ou MANAGER podem gerenciar integrações de marketplace',
    );
  }
}

@Controller('marketplace-integrations')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class MarketplaceIntegrationsController {
  constructor(private readonly service: MarketplaceIntegrationsService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    requireWriteRole(req);
    return this.service.findAll(req.user.activeRestaurantId);
  }

  @Get('active')
  listActive(@Request() req: AuthenticatedRequest) {
    return this.service.listActive(req.user.activeRestaurantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.findOne(id, req.user.activeRestaurantId);
  }

  @Post()
  create(
    @Body() dto: CreateMarketplaceIntegrationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.create(req.user.activeRestaurantId, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketplaceIntegrationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.update(id, req.user.activeRestaurantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.remove(id, req.user.activeRestaurantId);
  }

  @Post(':id/test-connection')
  @HttpCode(HttpStatus.OK)
  testConnection(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.testConnection(id, req.user.activeRestaurantId);
  }
}
