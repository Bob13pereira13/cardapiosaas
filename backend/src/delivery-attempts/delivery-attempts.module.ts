import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import {
  DeliveryAttemptsController,
  OrderDeliveryAttemptsController,
} from './delivery-attempts.controller';
import { DeliveryAttemptsService } from './delivery-attempts.service';

@Module({
  imports: [AuditModule],
  controllers: [OrderDeliveryAttemptsController, DeliveryAttemptsController],
  providers: [DeliveryAttemptsService],
})
export class DeliveryAttemptsModule {}
