import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TriggerHandler } from './trigger-handler.interface';

@Injectable()
export class FirstOrderAnniversaryHandler implements TriggerHandler {
  readonly triggerType = TriggerType.FIRST_ORDER_ANNIVERSARY;

  constructor(private readonly prisma: PrismaService) {}

  async findMatches(
    restaurantId: number,
    config: Record<string, unknown>,
  ): Promise<number[]> {
    const years = (config?.years as number) ?? 1;

    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Customer"
      WHERE "restaurantId" = ${restaurantId}
        AND "firstOrderAt" IS NOT NULL
        AND EXTRACT(MONTH FROM "firstOrderAt") = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM "firstOrderAt") = EXTRACT(DAY FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "firstOrderAt") = ${years}
    `;
    return rows.map((r) => r.id);
  }
}
