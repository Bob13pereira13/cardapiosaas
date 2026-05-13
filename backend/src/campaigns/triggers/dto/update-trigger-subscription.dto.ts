import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateTriggerSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;
}
