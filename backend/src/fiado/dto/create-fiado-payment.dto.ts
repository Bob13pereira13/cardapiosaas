import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TabPaymentMethod } from '@prisma/client';

const ALLOWED_METHODS = [
  TabPaymentMethod.DINHEIRO,
  TabPaymentMethod.PIX,
  TabPaymentMethod.CARTAO_DEBITO,
  TabPaymentMethod.CARTAO_CREDITO,
] as const;

export type FiadoPaymentMethod = (typeof ALLOWED_METHODS)[number];

export class CreateFiadoPaymentDto {
  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsEnum(ALLOWED_METHODS, {
    message: 'Método de pagamento inválido para quitação de fiado.',
  })
  metodo: FiadoPaymentMethod;

  @IsOptional()
  @IsString()
  observacao?: string;
}
