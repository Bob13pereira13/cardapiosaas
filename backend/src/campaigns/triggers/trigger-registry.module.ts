import { Module } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { BirthdayHandler } from './handlers/birthday.handler';
import { FiadoLimitNearHandler } from './handlers/fiado-limit-near.handler';
import { FirstOrderAnniversaryHandler } from './handlers/first-order-anniversary.handler';
import { FirstOrderPlacedHandler } from './handlers/first-order-placed.handler';
import { NoOrderXDaysHandler } from './handlers/no-order-x-days.handler';
import { TriggerHandler } from './handlers/trigger-handler.interface';

export type TriggerHandlerMap = Record<string, TriggerHandler>;

@Module({
  providers: [
    BirthdayHandler,
    NoOrderXDaysHandler,
    FirstOrderAnniversaryHandler,
    FirstOrderPlacedHandler,
    FiadoLimitNearHandler,
    {
      provide: 'TRIGGER_HANDLERS',
      useFactory: (
        b: BirthdayHandler,
        n: NoOrderXDaysHandler,
        a: FirstOrderAnniversaryHandler,
        p: FirstOrderPlacedHandler,
        f: FiadoLimitNearHandler,
      ): TriggerHandlerMap => ({
        [TriggerType.BIRTHDAY]: b,
        [TriggerType.NO_ORDER_X_DAYS]: n,
        [TriggerType.FIRST_ORDER_ANNIVERSARY]: a,
        [TriggerType.FIRST_ORDER_PLACED]: p,
        [TriggerType.FIADO_LIMIT_NEAR]: f,
      }),
      inject: [
        BirthdayHandler,
        NoOrderXDaysHandler,
        FirstOrderAnniversaryHandler,
        FirstOrderPlacedHandler,
        FiadoLimitNearHandler,
      ],
    },
  ],
  exports: ['TRIGGER_HANDLERS'],
})
export class TriggerRegistryModule {}
