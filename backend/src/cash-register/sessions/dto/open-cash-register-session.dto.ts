import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class OpenCashRegisterSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @Min(0)
  valorInicial: number;

  @IsOptional()
  @IsString()
  observacaoAbertura?: string;
}
