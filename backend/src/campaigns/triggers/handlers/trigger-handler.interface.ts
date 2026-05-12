import { TriggerType } from '@prisma/client';

export interface TriggerHandler {
  readonly triggerType: TriggerType;
  findMatches(
    restaurantId: number,

    config: Record<string, any>,
  ): Promise<number[]>;
}
