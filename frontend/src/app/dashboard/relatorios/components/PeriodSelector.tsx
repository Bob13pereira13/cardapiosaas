'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TrendPeriod } from '../hooks/useTrendsApi'

const PERIOD_LABELS: Record<TrendPeriod, string> = {
  current_week: 'Esta semana',
  current_month: 'Este mês',
  current_year: 'Este ano',
  last_7d: 'Últimos 7 dias',
  last_30d: 'Últimos 30 dias',
  last_90d: 'Últimos 90 dias',
  last_12m: 'Últimos 12 meses',
  last_24m: 'Últimos 24 meses',
}

type Props = {
  value: TrendPeriod
  onChange: (period: TrendPeriod) => void
  periods?: TrendPeriod[]
  from?: string
  to?: string
}

const DEFAULT_PERIODS: TrendPeriod[] = [
  'current_week',
  'current_month',
  'current_year',
  'last_7d',
  'last_30d',
  'last_90d',
  'last_12m',
  'last_24m',
]

export function PeriodSelector({ value, onChange, periods = DEFAULT_PERIODS, from, to }: Props) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={value} onValueChange={(v) => onChange(v as TrendPeriod)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p) => (
            <SelectItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {from && to && (
        <span className="text-xs text-zinc-500">
          {fmt(from)} – {fmt(to)}
        </span>
      )}
    </div>
  )
}
