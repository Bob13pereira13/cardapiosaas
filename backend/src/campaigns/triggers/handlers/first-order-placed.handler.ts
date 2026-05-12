import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TriggerHandler } from './trigger-handler.interface';

@Injectable()
export class FirstOrderPlacedHandler implements TriggerHandler {
  readonly triggerType = TriggerType.FIRST_ORDER_PLACED;

  constructor(private readonly prisma: PrismaService) {}

  // Does NOT mark firstOrderTriggered=true — the trigger engine (F.2) does that.
  async findMatches(
    restaurantId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: Record<string, unknown>,
  ): Promise<number[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await this.prisma.customer.findMany({
      where: {
        restaurantId,
        firstOrderAt: { gte: twentyFourHoursAgo },
        firstOrderTriggered: false,
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
