import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OptionPriceMode } from '@prisma/client';

export class UpdateOptionGroupDto {
  @IsString() @IsOptional() nome?: string;
  @IsInt() @Min(0) @IsOptional() minSelections?: number;
  @IsInt() @Min(1) @IsOptional() maxSelections?: number;
  @IsEnum(OptionPriceMode) @IsOptional() priceMode?: OptionPriceMode;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsInt() @IsOptional() displayOrder?: number;
}
