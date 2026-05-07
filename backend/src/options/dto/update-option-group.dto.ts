import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OptionGroupTipo, OptionPriceMode } from '@prisma/client';

export class UpdateOptionGroupDto {
  @IsString() @IsOptional() nome?: string;
  @IsString() @IsOptional() descricao?: string;
  @IsInt() @Min(0) @IsOptional() minSelections?: number;
  @IsInt() @Min(1) @IsOptional() maxSelections?: number;
  @IsEnum(OptionPriceMode) @IsOptional() priceMode?: OptionPriceMode;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsBoolean() @IsOptional() ativo?: boolean;
  @IsEnum(OptionGroupTipo) @IsOptional() tipo?: OptionGroupTipo;
  @IsInt() @IsOptional() displayOrder?: number;
}
