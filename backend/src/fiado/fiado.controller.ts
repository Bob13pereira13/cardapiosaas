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
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { CreateFiadoPaymentDto } from './dto/create-fiado-payment.dto';
import { QueryFiadoTransactionsDto } from './dto/query-fiado-transactions.dto';
import { UpdateFiadoLimiteDto } from './dto/update-fiado-limite.dto';
import { FiadoService } from './fiado.service';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: string | null;
  };
};

@Controller('customers')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class FiadoController {
  constructor(private readonly fiado: FiadoService) {}

  @Get(':id/fiado')
  getFiado(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.fiado.getFiado(id, req.user.activeRestaurantId);
  }

  @Patch(':id/fiado-limite')
  updateFiadoLimite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFiadoLimiteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.fiado.updateFiadoLimite(
      id,
      req.user.activeRestaurantId,
      dto,
      req.user.accountId,
      req.user.role,
    );
  }

  @Get(':id/fiado-transactions')
  getFiadoTransactions(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryFiadoTransactionsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.fiado.getFiadoTransactions(
      id,
      req.user.activeRestaurantId,
      query,
    );
  }

  @Post(':id/fiado-payments')
  createFiadoPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFiadoPaymentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.fiado.createFiadoPayment(
      id,
      req.user.activeRestaurantId,
      dto,
      req.user.accountId,
    );
  }
}
