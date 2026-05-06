import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { AsaasPaymentService } from './asaas-payment.service';
import { PaymentsController } from './payments.controller';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    CouponsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [OrdersController, PaymentsController],
  providers: [OrdersService, OrdersGateway, AsaasPaymentService],
})
export class OrdersModule {}
