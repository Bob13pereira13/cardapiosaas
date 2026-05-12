import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashRegisterSessionDto {
  @IsNumber()
  @Min(0)
  valorContado: number;

  @IsOptional()
  @IsString()
  observacaoFechamento?: string;
}
