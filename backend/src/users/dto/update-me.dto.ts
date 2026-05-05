import {
  IsBoolean,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'WhatsApp inválido. Use apenas números (10-15 dígitos).',
  })
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsBoolean()
  aberto?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário deve estar no formato HH:MM.' })
  horarioAbertura?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário deve estar no formato HH:MM.' })
  horarioFechamento?: string;

  @IsOptional()
  @IsHexColor()
  corPrimaria?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxaEntrega?: number;

  @IsOptional()
  @IsString()
  @Matches(/^$|^GTM-[A-Z0-9]+$/i, {
    message: 'GTM ID deve estar no formato GTM-XXXX.',
  })
  gtmId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^G-[A-Z0-9]+$/i, {
    message: 'GA4 Measurement ID deve estar no formato G-XXXX.',
  })
  ga4MeasurementId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^\d+$/, { message: 'Meta Pixel ID deve conter apenas numeros.' })
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  metaAccessToken?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i, {
    message: 'Dominio deve ser um hostname valido, como loja.seudominio.com.',
  })
  customDomain?: string;
}
