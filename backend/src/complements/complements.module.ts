import { Module } from '@nestjs/common';
import { ComplementsController } from './complements.controller';
import { ComplementsService } from './complements.service';

@Module({
  controllers: [ComplementsController],
  providers: [ComplementsService],
  exports: [ComplementsService],
})
export class ComplementsModule {}
