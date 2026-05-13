import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ComplementLink,
  ComplementPriceMode,
  ComplementSelectionRule,
  ComplementVisibility,
} from '@prisma/client';

export class ComplementOptionInputDto {
  @IsInt()
  @Min(1)
  optionId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  extraPrice?: number;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateComplementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ComplementSelectionRule)
  selectionRule: ComplementSelectionRule;

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

  @IsArray()
  @ArrayMinSize(0)
  @IsEnum(ComplementLink, { each: true })
  availableLinks: ComplementLink[];

  @IsOptional()
  @IsEnum(ComplementVisibility)
  visibility?: ComplementVisibility;

  @IsOptional()
  @IsEnum(ComplementPriceMode)
  priceMode?: ComplementPriceMode;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplementOptionInputDto)
  options?: ComplementOptionInputDto[];
}
