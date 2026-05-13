import { IsEnum, IsIn, IsOptional } from 'class-validator';

export type TrendPeriod =
  | 'current_month'
  | 'current_week'
  | 'current_year'
  | 'last_7d'
  | 'last_30d'
  | 'last_90d'
  | 'last_12m'
  | 'last_24m';

export type Granularity = 'day' | 'month';

const ALL_PERIODS: TrendPeriod[] = [
  'current_month',
  'current_week',
  'current_year',
  'last_7d',
  'last_30d',
  'last_90d',
  'last_12m',
  'last_24m',
];

export class SummaryQueryDto {
  @IsOptional()
  @IsIn(['current_month', 'current_week', 'current_year'])
  period?: 'current_month' | 'current_week' | 'current_year' = 'current_month';
}

export class RevenueQueryDto {
  @IsOptional()
  @IsEnum({ day: 'day', month: 'month' })
  @IsIn(['day', 'month'])
  granularity?: Granularity = 'day';

  @IsOptional()
  @IsIn(ALL_PERIODS)
  period?: TrendPeriod = 'last_30d';
}
