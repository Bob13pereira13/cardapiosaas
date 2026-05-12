import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../../auth/restaurant-scope.guard';
import { CloseCashRegisterSessionDto } from './dto/close-cash-register-session.dto';
import { OpenCashRegisterSessionDto } from './dto/open-cash-register-session.dto';
import { QueryCashRegisterSessionsDto } from './dto/query-cash-register-sessions.dto';
import { CashRegisterSessionsService } from './cash-register-sessions.service';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: string | null;
  };
};

@Controller('cash-register-sessions')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CashRegisterSessionsController {
  constructor(private readonly sessions: CashRegisterSessionsService) {}

  // Static routes BEFORE :id to avoid routing conflicts
  @Get('me/active')
  getMyActive(@Request() req: AuthenticatedRequest) {
    return this.sessions.getMyActive(
      req.user.activeRestaurantId,
      req.user.accountId,
    );
  }

  @Post()
  open(
    @Body() dto: OpenCashRegisterSessionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessions.open(
      req.user.activeRestaurantId,
      dto,
      req.user.accountId,
    );
  }

  @Get()
  findAll(
    @Query() query: QueryCashRegisterSessionsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessions.findAll(req.user.activeRestaurantId, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessions.findOne(id, req.user.activeRestaurantId);
  }

  @Get(':id/report')
  getReport(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessions.getReport(id, req.user.activeRestaurantId);
  }

  @Post(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseCashRegisterSessionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessions.close(
      id,
      req.user.activeRestaurantId,
      dto,
      req.user.accountId,
      req.user.role,
    );
  }
}
