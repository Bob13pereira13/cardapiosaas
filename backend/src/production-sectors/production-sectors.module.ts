import { Module } from '@nestjs/common';
import { ProductionSectorsService } from './production-sectors.service';
import { ProductionSectorsController } from './production-sectors.controller';

@Module({
  controllers: [ProductionSectorsController],
  providers: [ProductionSectorsService],
})
export class ProductionSectorsModule {}
