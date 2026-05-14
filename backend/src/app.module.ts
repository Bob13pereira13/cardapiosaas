import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import r2Config from './config/r2.config';
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
import { CombosModule } from './combos/combos.module';
import { AuditModule } from './audit/audit.module';
import { TeamModule } from './team/team.module';
import { ComplementsModule } from './complements/complements.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ProductionSectorsModule } from './production-sectors/production-sectors.module';
import { PromotionsModule } from './promotions/promotions.module';
import { TabsModule } from './tabs/tabs.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { DeliveryAttemptsModule } from './delivery-attempts/delivery-attempts.module';
import { EncryptionModule } from './encryption/encryption.module';
import { MarketplaceConnectorsModule } from './marketplace-connectors/marketplace-connectors.module';
import { MarketplaceIntegrationsModule } from './marketplace-integrations/marketplace-integrations.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { FiadoModule } from './fiado/fiado.module';
import { AudiencesModule } from './audiences/audiences.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [r2Config], isGlobal: true }),
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
    CombosModule,
    AuditModule,
    TeamModule,
    ComplementsModule,
    RestaurantsModule,
    ProductionSectorsModule,
    PromotionsModule,
    TabsModule,
    DeliveryZonesModule,
    DeliveryAttemptsModule,
    EncryptionModule,
    MarketplaceConnectorsModule,
    MarketplaceIntegrationsModule,
    CashRegisterModule,
    FiadoModule,
    AudiencesModule,
    CampaignsModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
