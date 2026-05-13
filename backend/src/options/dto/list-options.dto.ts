import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OptionStockStatus } from '@prisma/client';

export class ListOptionsDto {
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
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(OptionStockStatus)
  stockStatus?: OptionStockStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  includeUsage?: boolean = false;
}
