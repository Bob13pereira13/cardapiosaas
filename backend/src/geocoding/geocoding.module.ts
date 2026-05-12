import { Module } from '@nestjs/common';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { ViaCepProvider } from './providers/viacep.provider';
import { GeocodingService } from './geocoding.service';

@Module({
  providers: [GeocodingService, BrasilApiProvider, ViaCepProvider],
  exports: [GeocodingService],
})
export class GeocodingModule {}
