import {
  IsBoolean,
  IsEmail,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) nome?: string;
  @IsOptional() @IsEmail() email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/, { message: 'WhatsApp inválido. Use apenas números (10-15 dígitos).' })
  whatsapp?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) slug?: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() banner?: string;
  @IsOptional() @IsBoolean() aberto?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário deve estar no formato HH:MM.' })
  horarioAbertura?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário deve estar no formato HH:MM.' })
  horarioFechamento?: string;

  @IsOptional() @IsHexColor() corPrimaria?: string;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) taxaEntrega?: number;

  @IsOptional()
  @IsString()
  @Matches(/^$|^GTM-[A-Z0-9]+$/i, { message: 'GTM ID deve estar no formato GTM-XXXX.' })
  gtmId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^G-[A-Z0-9]+$/i, { message: 'GA4 Measurement ID deve estar no formato G-XXXX.' })
  ga4MeasurementId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^\d+$/, { message: 'Meta Pixel ID deve conter apenas numeros.' })
  metaPixelId?: string;

  @IsOptional() @IsString() metaAccessToken?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i, {
    message: 'Dominio deve ser um hostname valido, como loja.seudominio.com.',
  })
  customDomain?: string;

  // Entrega
  @IsOptional() @IsBoolean() aceitaEntrega?: boolean;
  @IsOptional() @IsBoolean() aceitaRetirada?: boolean;
  @IsOptional() @IsBoolean() aceitaMesa?: boolean;
  @IsOptional() @IsString() tempoEstimadoEntrega?: string;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) pedidoMinimoEntregaGratis?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) raioEntregaKm?: number;

  // Pagamentos presenciais
  @IsOptional() @IsBoolean() aceitaDinheiro?: boolean;
  @IsOptional() @IsBoolean() aceitaPixPresencial?: boolean;
  @IsOptional() @IsBoolean() aceitaCartaoCredito?: boolean;
  @IsOptional() @IsBoolean() aceitaCartaoDebito?: boolean;
  @IsOptional() @IsString() chavePix?: string;

  // Horários por dia
  @IsOptional() businessHours?: Record<string, { active: boolean; open: string; close: string }>;

  // Aparência do cardápio
  @IsOptional() @IsString() textoBoasVindas?: string;
  @IsOptional() @IsString() textoRodape?: string;
  @IsOptional() @IsBoolean() mostrarPrecos?: boolean;
  @IsOptional() @IsString() mensagemFechado?: string;
  @IsOptional() @IsBoolean() pausaAtiva?: boolean;
  @IsOptional() @IsString() pausaAbertura?: string;
  @IsOptional() @IsString() pausaFechamento?: string;
  @IsOptional() bairrosAtendidos?: unknown;
  @IsOptional() @IsString() mensagemEntrega?: string;
  @IsOptional() @IsString() wppMsgPedido?: string;
  @IsOptional() @IsString() wppMsgConfirmado?: string;
  @IsOptional() @IsString() wppMsgPronto?: string;
  @IsOptional() @IsString() wppMsgSaiu?: string;
  @IsOptional() @IsBoolean() wppEnvioAutomatico?: boolean;
  @IsOptional() @IsString() nomePlataforma?: string;
  @IsOptional() @IsString() emailSuporte?: string;
  @IsOptional() @IsString() whatsappSuporte?: string;
  @IsOptional() @IsString() urlPublica?: string;

  // Troca de senha
  @IsOptional() @IsString() currentPassword?: string;
  @IsOptional() @IsString() newPassword?: string;
}
