import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OptionPriceMode } from '@prisma/client';

export class CreateOptionGroupDto {
  @IsString() nome: string;
  @IsInt() @Min(0) minSelections: number;
  @IsInt() @Min(1) maxSelections: number;
  @IsEnum(OptionPriceMode) priceMode: OptionPriceMode;
  @IsBoolean() required: boolean;
  @IsInt() @IsOptional() displayOrder?: number;
}
