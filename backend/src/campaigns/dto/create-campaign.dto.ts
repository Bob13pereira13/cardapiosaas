import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AgendamentoTipo, CampaignChannel, CampaignTipo } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsEnum(CampaignTipo)
  tipo: CampaignTipo;

  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @IsOptional()
  @IsInt()
  audienceId?: number;

  @IsOptional()
  @IsInt()
  couponId?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  templateBody: string;

  @IsEnum(AgendamentoTipo)
  agendamentoTipo: AgendamentoTipo;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  recurringCron?: string;

  @IsOptional()
  @IsString()
  recurringEndsAt?: string;
}
