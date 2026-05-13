import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ComplementSelectionRule, ComplementVisibility } from '@prisma/client';

export class ListComplementsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ComplementSelectionRule)
  selectionRule?: ComplementSelectionRule;

  @IsOptional()
  @IsEnum(ComplementVisibility)
  visibility?: ComplementVisibility;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  includeUsage?: boolean = false;
}
