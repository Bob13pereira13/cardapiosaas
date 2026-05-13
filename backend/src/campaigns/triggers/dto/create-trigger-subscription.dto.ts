import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { TriggerType } from '@prisma/client';

export class CreateTriggerSubscriptionDto {
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
