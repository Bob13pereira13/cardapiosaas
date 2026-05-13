import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import type { TriggerHandlerMap } from './trigger-registry.module';

@Injectable()
export class TriggerEngineService {
  private readonly logger = new Logger(TriggerEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
    @Inject('TRIGGER_HANDLERS') private readonly handlers: TriggerHandlerMap,
  ) {}

  @Cron('0 9 * * *')
  async processAllTriggers(): Promise<{
    processed: number;
    dispatched: number;
  }> {
    const subs = await this.prisma.triggerSubscription.findMany({
      where: { ativo: true },
      include: { campaign: true },
    });

    let dispatched = 0;

    for (const sub of subs) {
      const handler = this.handlers[sub.triggerType];
      if (!handler) {
        this.logger.warn(`No handler for ${sub.triggerType}`);
        continue;
      }

      try {
        const ids = await handler.findMatches(
          sub.restaurantId,
          sub.triggerConfig as Record<string, unknown>,
        );
        if (ids.length === 0) continue;

        await this.dispatch.dispatchToCustomers(sub.campaignId, ids);

        // FIRST_ORDER_PLACED: mark all candidates as triggered after dispatch attempt.
        // Marking all (not just SENT) prevents retry-loop for customers with invalid phones.
        // TODO: split "attempt made" from "real success" for finer control.
        if (sub.triggerType === TriggerType.FIRST_ORDER_PLACED) {
          await this.prisma.customer.updateMany({
            where: { id: { in: ids } },
            data: { firstOrderTriggered: true },
          });
        }

        dispatched += ids.length;
      } catch (e) {
        this.logger.error(
          `Trigger ${sub.id} (${sub.triggerType}) failed: ${(e as Error).message}`,
        );
      }
    }

    return { processed: subs.length, dispatched };
  }
}
