import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CashRegisterSessionsController } from './sessions/cash-register-sessions.controller';
import { CashRegisterSessionsService } from './sessions/cash-register-sessions.service';
import { CashMovementsController } from './movements/cash-movements.controller';
import { CashMovementsService } from './movements/cash-movements.service';

@Module({
  imports: [AuditModule],
  controllers: [CashRegisterSessionsController, CashMovementsController],
  providers: [CashRegisterSessionsService, CashMovementsService],
  exports: [CashRegisterSessionsService, CashMovementsService],
})
export class CashRegisterModule {}
