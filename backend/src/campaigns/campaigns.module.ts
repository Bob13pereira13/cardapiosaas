import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ZApiModule } from '../integrations/zapi/zapi.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { DispatchService } from './dispatch/dispatch.service';
import { CampaignSchedulerService } from './scheduling/campaign-scheduler.service';
import { TriggerEngineService } from './triggers/trigger-engine.service';
import { TriggerRegistryModule } from './triggers/trigger-registry.module';
import { TriggerSubscriptionsController } from './triggers/trigger-subscriptions.controller';
import { TriggerSubscriptionsService } from './triggers/trigger-subscriptions.service';

@Module({
  imports: [AuditModule, ZApiModule, TriggerRegistryModule],
  controllers: [CampaignsController, TriggerSubscriptionsController],
  providers: [
    CampaignsService,
    DispatchService,
    CampaignSchedulerService,
    TriggerEngineService,
    TriggerSubscriptionsService,
  ],
  exports: [
    CampaignsService,
    DispatchService,
    CampaignSchedulerService,
    TriggerEngineService,
    TriggerSubscriptionsService,
  ],
})
export class CampaignsModule {}
