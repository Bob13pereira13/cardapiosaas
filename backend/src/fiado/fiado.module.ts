import { Module } from '@nestjs/common';
import { FiadoController } from './fiado.controller';
import { FiadoService } from './fiado.service';

@Module({
  controllers: [FiadoController],
  providers: [FiadoService],
  exports: [FiadoService],
})
export class FiadoModule {}
