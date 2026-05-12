import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CashMovementType } from '@prisma/client';

// Only manual origins are accepted via this endpoint.
// PAYMENT_CASH and FIADO_QUITACAO are created automatically by the system.
const MANUAL_ORIGINS = ['MANUAL_SANGRIA', 'MANUAL_SUPRIMENTO'] as const;
type ManualOrigin = (typeof MANUAL_ORIGINS)[number];

export class CreateCashMovementDto {
  @IsIn(Object.values(CashMovementType))
  tipo: CashMovementType;

  @IsIn(MANUAL_ORIGINS)
  origem: ManualOrigin;

  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
