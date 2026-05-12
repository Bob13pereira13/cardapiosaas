import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TriggerHandler } from './trigger-handler.interface';

@Injectable()
export class BirthdayHandler implements TriggerHandler {
  readonly triggerType = TriggerType.BIRTHDAY;

  constructor(private readonly prisma: PrismaService) {}

  // TODO: 29/02 in non-leap year does not fire — accepted for MVP.
  // Future option: fire on 28/02 or 01/03 (decision pending).
  async findMatches(
    restaurantId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: Record<string, unknown>,
  ): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Customer"
      WHERE "restaurantId" = ${restaurantId}
        AND "dataNascimento" IS NOT NULL
        AND EXTRACT(MONTH FROM "dataNascimento") = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM "dataNascimento") = EXTRACT(DAY FROM CURRENT_DATE)
    `;
    return rows.map((r) => r.id);
  }
}
