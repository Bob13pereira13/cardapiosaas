import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { DeliveryCheckService } from './delivery-check.service';
import { DeliveryZonesController } from './delivery-zones.controller';
import { DeliveryZonesService } from './delivery-zones.service';

@Module({
  imports: [AuditModule, GeocodingModule],
  controllers: [DeliveryZonesController],
  providers: [DeliveryZonesService, DeliveryCheckService],
  exports: [DeliveryZonesService, DeliveryCheckService],
})
export class DeliveryZonesModule {}
