import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TabPaymentMethod } from '@prisma/client';
import { RestaurantScopeGuard } from '../../auth/restaurant-scope.guard';
import { TabPaymentsService } from './payments.service';

type AuthenticatedRequest = {
  user: { id: number; accountId: number; activeRestaurantId: number };
};

@Controller('tabs/:tabId/payments')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class TabPaymentsController {
  constructor(private readonly payments: TabPaymentsService) {}

  @Get()
  findByTab(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.findByTab(tabId, req.user.activeRestaurantId);
  }

  @Post()
  create(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Body()
    body: {
      metodo: TabPaymentMethod;
      valor: number;
      trocoEm?: number;
      appliesToOrderItemIds?: number[];
      observacao?: string;
      pixTransactionId?: string;
      cardLast4?: string;
      cardBrand?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.create(
      tabId,
      req.user.activeRestaurantId,
      body,
      req.user.accountId,
    );
  }

  @Patch(':paymentId/confirm')
  confirm(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.confirm(
      paymentId,
      tabId,
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Patch(':paymentId/refund')
  refund(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.refund(paymentId, tabId, req.user.activeRestaurantId);
  }

  @Delete(':paymentId')
  remove(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.remove(paymentId, tabId, req.user.activeRestaurantId);
  }

  @Post('split-equal')
  splitEqual(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Body() body: { n: number; metodo: TabPaymentMethod },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.splitEqual(
      tabId,
      req.user.activeRestaurantId,
      body.n,
      body.metodo,
      req.user.accountId,
    );
  }

  @Post('split-by-items')
  splitByItems(
    @Param('tabId', ParseIntPipe) tabId: number,
    @Body()
    body: {
      splits: Array<{
        metodo: TabPaymentMethod;
        valor: number;
        appliesToOrderItemIds: number[];
        observacao?: string;
      }>;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.payments.splitByItems(
      tabId,
      req.user.activeRestaurantId,
      body.splits,
      req.user.accountId,
    );
  }
}
