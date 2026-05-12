import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TriggerHandler } from './trigger-handler.interface';

@Injectable()
export class NoOrderXDaysHandler implements TriggerHandler {
  readonly triggerType = TriggerType.NO_ORDER_X_DAYS;

  constructor(private readonly prisma: PrismaService) {}

  async findMatches(
    restaurantId: number,
    config: Record<string, unknown>,
  ): Promise<number[]> {
    const days = (config?.days as number) ?? 30;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    const rows = await this.prisma.customer.findMany({
      where: {
        restaurantId,
        OR: [
          { lastOrderAt: { lt: threshold } },
          {
            lastOrderAt: null,
            createdAt: { lt: threshold },
          },
        ],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
