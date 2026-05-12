import { Module } from '@nestjs/common';
import { ZApiClientService } from './zapi-client.service';

@Module({
  providers: [ZApiClientService],
  exports: [ZApiClientService],
})
export class ZApiModule {}
