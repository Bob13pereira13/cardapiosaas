import { Module } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AsaasBillingService } from './asaas-billing.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, AsaasBillingService, AdminGuard],
})
export class BillingModule {}
