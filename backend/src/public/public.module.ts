import { Module } from '@nestjs/common';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, DeliveryZonesModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
