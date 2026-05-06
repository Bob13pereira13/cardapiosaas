import { Module } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AsaasBillingService } from './asaas-billing.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [BillingController],
  providers: [BillingService, AsaasBillingService, AdminGuard],
})
export class BillingModule {}
