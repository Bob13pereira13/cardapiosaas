import { CashRegisterSessionStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCashRegisterSessionsDto {
  @IsOptional()
  @IsEnum(CashRegisterSessionStatus)
  status?: CashRegisterSessionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openedByAccountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  take?: number;
}
