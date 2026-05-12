import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { AsaasPaymentService } from './asaas-payment.service';
import { CouponsModule } from '../coupons/coupons.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AuditModule } from '../audit/audit.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { TabsModule } from '../tabs/tabs.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';

@Module({
  imports: [
    CouponsModule,
    LoyaltyModule,
    AuditModule,
    PromotionsModule,
    TabsModule,
    DeliveryZonesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, AsaasPaymentService],
})
export class OrdersModule {}
