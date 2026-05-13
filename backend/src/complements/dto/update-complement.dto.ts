import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ComplementLink,
  ComplementPriceMode,
  ComplementSelectionRule,
  ComplementVisibility,
} from '@prisma/client';

export class UpdateComplementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ComplementSelectionRule)
  selectionRule?: ComplementSelectionRule;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelections?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSelections?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsEnum(ComplementLink, { each: true })
  availableLinks?: ComplementLink[];

  @IsOptional()
  @IsEnum(ComplementVisibility)
  visibility?: ComplementVisibility;

  @IsOptional()
  @IsEnum(ComplementPriceMode)
  priceMode?: ComplementPriceMode;
}
