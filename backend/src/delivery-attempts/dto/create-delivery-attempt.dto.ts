import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDeliveryAttemptDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
