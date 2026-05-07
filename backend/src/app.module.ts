import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PublicModule } from './public/public.module';
import { UploadModule } from './upload/upload.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';
import { AdminModule } from './admin/admin.module';
import { BillingModule } from './billing/billing.module';
import { CustomersModule } from './customers/customers.module';
import { TrackingModule } from './tracking/tracking.module';
import { ReportsModule } from './reports/reports.module';
import { OptionsModule } from './options/options.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NpsModule } from './nps/nps.module';
import { TablesModule } from './tables/tables.module';
import { AgendaModule } from './agenda/agenda.module';
import { CombosModule } from './combos/combos.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AuditModule } from './audit/audit.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    ProductsModule,
    CategoriesModule,
    UsersModule,
    AuthModule,
    PublicModule,
    UploadModule,
    OrdersModule,
    CouponsModule,
    AdminModule,
    BillingModule,
    CustomersModule,
    TrackingModule,
    ReportsModule,
    OptionsModule,
    LoyaltyModule,
    CustomerAuthModule,
    SchedulerModule,
    IntegrationsModule,
    NpsModule,
    TablesModule,
    AgendaModule,
    CombosModule,
    CampaignsModule,
    AuditModule,
    TeamModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
