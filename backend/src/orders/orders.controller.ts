import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

type AuthenticatedRequest = {
  user: { id: number; accountId: number; activeRestaurantId: number };
};

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('public/orders/:slug')
  createPublic(
    @Param('slug') slug: string,
    @Body() dto: CreateOrderDto,
    @Headers('x-cardapio-host') forwardedHost?: string,
    @Headers('host') host?: string,
  ) {
    return this.orders.create(slug, dto, forwardedHost || host);
  }

  @Post('public/orders/by-host')
  createPublicByHost(
    @Body() dto: CreateOrderDto,
    @Headers('x-cardapio-host') forwardedHost?: string,
    @Headers('host') host?: string,
  ) {
    return this.orders.create('domain', dto, forwardedHost || host);
  }

  @Post('public/webhooks/asaas/orders')
  handleAsaasWebhook(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: unknown,
  ) {
    return this.orders.handlePaymentWebhook(token, body);
  }

  @Get('financial/summary')
  @UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
  financialSummary(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: 'TODAY' | 'WEEK' | 'MONTH' = 'TODAY',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.orders.financialSummary(req.user.activeRestaurantId, {
      period,
      dateFrom,
      dateTo,
    });
  }

  @Post('orders/manual')
  @UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
  createManual(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateManualOrderDto,
  ) {
    return this.orders.createManualOrder(req.user.activeRestaurantId, dto);
  }

  @Get('orders')
  @UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orders.findAll(req.user.activeRestaurantId, query);
  }

  @Get('orders/:id')
  @UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.orders.findOne(Number(id), req.user.activeRestaurantId);
  }

  @Patch('orders/:id/status')
  @UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
  updateStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(
      Number(id),
      req.user.activeRestaurantId,
      dto.orderStatus,
      req.user.accountId,
    );
  }
}
