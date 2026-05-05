import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetaConversionService } from './meta-conversion.service';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TrackingController],
  providers: [MetaConversionService],
})
export class TrackingModule {}
