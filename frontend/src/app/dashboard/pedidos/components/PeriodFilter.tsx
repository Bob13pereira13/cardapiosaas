'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type PeriodFilterValue = 'today' | 'last_week' | 'last_month' | 'custom'

type Props = {
  value: PeriodFilterValue
  onChange: (value: PeriodFilterValue) => void
}

const PERIOD_OPTIONS: { value: PeriodFilterValue; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'last_week', label: 'Última semana' },
  { value: 'last_month', label: 'Último mês' },
  { value: 'custom', label: 'Personalizado' },
]

export function PeriodFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodFilterValue)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
