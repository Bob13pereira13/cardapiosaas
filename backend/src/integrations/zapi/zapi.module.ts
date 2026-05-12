import { Module } from '@nestjs/common';
import { ZApiClientService } from './zapi-client.service';
import { ZApiWebhookController } from './webhook/zapi-webhook.controller';
import { ZApiWebhookService } from './webhook/zapi-webhook.service';
import { ZApiMockSimulatorService } from './webhook/zapi-mock-simulator.service';

@Module({
  controllers: [ZApiWebhookController],
  providers: [ZApiClientService, ZApiWebhookService, ZApiMockSimulatorService],
  exports: [ZApiClientService, ZApiWebhookService, ZApiMockSimulatorService],
})
export class ZApiModule {}
