import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ZApiModule } from '../integrations/zapi/zapi.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { DispatchService } from './dispatch/dispatch.service';
import { CampaignSchedulerService } from './scheduling/campaign-scheduler.service';
import { TriggerEngineService } from './triggers/trigger-engine.service';
import { TriggerRegistryModule } from './triggers/trigger-registry.module';

@Module({
  imports: [AuditModule, ZApiModule, TriggerRegistryModule],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    DispatchService,
    CampaignSchedulerService,
    TriggerEngineService,
  ],
  exports: [
    CampaignsService,
    DispatchService,
    CampaignSchedulerService,
    TriggerEngineService,
  ],
})
export class CampaignsModule {}
