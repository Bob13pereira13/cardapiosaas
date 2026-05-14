import { Module } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';
import { R2Service } from './r2.service';

@Module({
  providers: [R2Service, ImageProcessorService],
  exports: [R2Service, ImageProcessorService],
})
export class StorageModule {}
