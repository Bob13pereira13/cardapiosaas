import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ZApiModule } from '../integrations/zapi/zapi.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { DispatchService } from './dispatch/dispatch.service';

@Module({
  imports: [AuditModule, ZApiModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, DispatchService],
  exports: [CampaignsService, DispatchService],
})
export class CampaignsModule {}
