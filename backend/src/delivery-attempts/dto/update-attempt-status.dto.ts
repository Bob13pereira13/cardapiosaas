import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeliveryAttemptStatus } from '@prisma/client';

export class UpdateAttemptStatusDto {
  @IsEnum(DeliveryAttemptStatus)
  status: DeliveryAttemptStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
