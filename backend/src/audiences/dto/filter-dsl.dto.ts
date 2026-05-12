import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class FilterDSLDto {
  @IsOptional()
  @IsEnum(['ALL', 'ANY'])
  matchMode?: 'ALL' | 'ANY';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['ALL', 'ANY'])
  tagsMode?: 'ALL' | 'ANY';

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSpentMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSpentMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysSinceLastOrderMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysSinceLastOrderMax?: number;

  @IsOptional()
  @IsBoolean()
  hasFiadoOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  hasFiadoOverdue?: boolean;
}
