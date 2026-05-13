import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { OrderOrigin, OrderStatus } from '@prisma/client';

export class ListOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => Object.values(OrderOrigin).includes(v as OrderOrigin)),
  )
  origins?: OrderOrigin[];

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => Object.values(OrderOrigin).includes(v as OrderOrigin)),
  )
  origin?: OrderOrigin[];

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 20;
}
