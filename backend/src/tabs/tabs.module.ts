import { Module } from '@nestjs/common';
import { TabsService } from './tabs.service';
import { TabsController } from './tabs.controller';
import { TabPaymentsService } from './payments/payments.service';
import { TabPaymentsController } from './payments/payments.controller';

@Module({
  controllers: [TabsController, TabPaymentsController],
  providers: [TabsService, TabPaymentsService],
  exports: [TabsService],
})
export class TabsModule {}
