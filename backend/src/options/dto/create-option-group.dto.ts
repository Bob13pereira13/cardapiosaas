import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OptionGroupTipo, OptionPriceMode } from '@prisma/client';

export class CreateOptionGroupDto {
  @IsString() nome: string;
  @IsString() @IsOptional() descricao?: string;
  @IsInt() @Min(0) minSelections: number;
  @IsInt() @Min(1) maxSelections: number;
  @IsEnum(OptionPriceMode) priceMode: OptionPriceMode;
  @IsBoolean() required: boolean;
  @IsBoolean() @IsOptional() ativo?: boolean;
  @IsEnum(OptionGroupTipo) @IsOptional() tipo?: OptionGroupTipo;
  @IsInt() @IsOptional() displayOrder?: number;
}
