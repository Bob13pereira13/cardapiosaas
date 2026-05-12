import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TriggerHandler } from './trigger-handler.interface';

@Injectable()
export class FiadoLimitNearHandler implements TriggerHandler {
  readonly triggerType = TriggerType.FIADO_LIMIT_NEAR;

  constructor(private readonly prisma: PrismaService) {}

  async findMatches(
    restaurantId: number,
    config: Record<string, unknown>,
  ): Promise<number[]> {
    const threshold = (config?.thresholdPercent as number) ?? 90;

    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Customer"
      WHERE "restaurantId" = ${restaurantId}
        AND "fiadoLimite" > 0
        AND "fiadoTotal" >= ("fiadoLimite" * ${threshold} / 100.0)
    `;
    return rows.map((r) => r.id);
  }
}
