import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AudiencesController } from './audiences.controller';
import { AudiencesService } from './audiences.service';

@Module({
  imports: [AuditModule],
  controllers: [AudiencesController],
  providers: [AudiencesService],
  exports: [AudiencesService],
})
export class AudiencesModule {}
