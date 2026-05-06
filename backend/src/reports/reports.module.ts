import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
