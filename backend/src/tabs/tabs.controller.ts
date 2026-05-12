import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TabStatus, TabTipo } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { TabsService } from './tabs.service';

type AuthenticatedRequest = {
  user: { id: number; accountId: number; activeRestaurantId: number };
};

@Controller('tabs')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class TabsController {
  constructor(private readonly tabs: TabsService) {}

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: TabStatus,
    @Query('tipo') tipo?: TabTipo,
    @Query('tableId') tableId?: string,
    @Query('openedAfter') openedAfter?: string,
    @Query('openedBefore') openedBefore?: string,
  ) {
    return this.tabs.findAll(req.user.activeRestaurantId, {
      status,
      tipo,
      tableId: tableId ? Number(tableId) : undefined,
      openedAfter,
      openedBefore,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.findOne(id, req.user.activeRestaurantId);
  }

  @Post()
  create(
    @Body()
    body: {
      tipo: TabTipo;
      tableId?: number;
      customerId?: number;
      customerNome?: string;
      numeroComandaFisica?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.create(
      { ...body, openedByAccountId: req.user.accountId },
      req.user.activeRestaurantId,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      tableId?: number | null;
      customerId?: number | null;
      customerNome?: string | null;
      numeroComandaFisica?: string | null;
      taxaServico?: number | null;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.update(id, body, req.user.activeRestaurantId);
  }

  @Post(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.close(id, req.user.activeRestaurantId, req.user.accountId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.cancel(
      id,
      req.user.activeRestaurantId,
      body.motivo,
      req.user.accountId,
    );
  }

  @Post(':id/discount')
  applyDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { valor: number; motivo: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.applyDiscount(
      id,
      req.user.activeRestaurantId,
      body.valor,
      body.motivo,
      req.user.accountId,
    );
  }

  @Post(':id/transfer')
  transferTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tableId: number },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tabs.transferTable(
      id,
      req.user.activeRestaurantId,
      body.tableId,
      req.user.accountId,
    );
  }
}
