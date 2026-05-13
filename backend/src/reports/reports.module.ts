import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TrendsService } from './trends/trends.service';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    CacheModule.register({ ttl: 5 * 60 * 1000 }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, TrendsService],
})
export class ReportsModule {}
