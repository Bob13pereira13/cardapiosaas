import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  AgendamentoTipo,
  CampaignChannel,
  CampaignStatus,
} from '@prisma/client';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  templateBody?: string;

  @IsOptional()
  @IsEnum(AgendamentoTipo)
  agendamentoTipo?: AgendamentoTipo;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  recurringCron?: string;

  @IsOptional()
  @IsString()
  recurringEndsAt?: string;

  // Permitido apenas para SCHEDULED → CANCELED
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
