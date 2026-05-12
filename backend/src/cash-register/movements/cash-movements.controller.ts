import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../../auth/restaurant-scope.guard';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashMovementsService } from './cash-movements.service';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: string | null;
  };
};

@Controller('cash-register-sessions/:sessionId/movements')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class CashMovementsController {
  constructor(private readonly movements: CashMovementsService) {}

  @Post()
  create(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateCashMovementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.movements.create(
      sessionId,
      dto,
      req.user.accountId,
      req.user.activeRestaurantId,
      req.user.role,
    );
  }

  @Get()
  findAll(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.movements.findAll(sessionId, req.user.activeRestaurantId);
  }
}
