import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OptionStockStatus } from '@prisma/client';

export class CreateOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codePdv?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsBoolean()
  useTechSheet?: boolean;

  @IsOptional()
  @IsEnum(OptionStockStatus)
  stockStatus?: OptionStockStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
