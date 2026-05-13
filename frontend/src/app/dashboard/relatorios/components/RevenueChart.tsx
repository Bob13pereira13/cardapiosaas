'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Granularity, RevenueResponse, TrendPeriod } from '../hooks/useTrendsApi'

const DAY_PERIODS: TrendPeriod[] = ['last_7d', 'last_30d', 'last_90d']
const MONTH_PERIODS: TrendPeriod[] = ['last_12m', 'last_24m', 'current_year']

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(date: string, granularity: Granularity) {
  if (granularity === 'month') {
    const [year, month] = date.split('-')
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit',
    })
  }
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

type Props = {
  data: RevenueResponse | null
  loading: boolean
  error: string | null
  granularity: Granularity
  period: TrendPeriod
  onGranularityChange: (g: Granularity) => void
  onPeriodChange: (p: TrendPeriod) => void
}

const GRANULARITY_LABEL: Record<Granularity, string> = {
  day: 'Por dia',
  month: 'Por mês',
}

const PERIOD_LABELS: Partial<Record<TrendPeriod, string>> = {
  last_7d: '7d',
  last_30d: '30d',
  last_90d: '90d',
  last_12m: '12m',
  last_24m: '24m',
  current_year: 'Este ano',
}

export function RevenueChart({
  data,
  loading,
  error,
  granularity,
  period,
  onGranularityChange,
  onPeriodChange,
}: Props) {
  const activePeriods = granularity === 'day' ? DAY_PERIODS : MONTH_PERIODS

  const handleGranularityChange = (g: Granularity) => {
    onGranularityChange(g)
    const newPeriods = g === 'day' ? DAY_PERIODS : MONTH_PERIODS
    if (!newPeriods.includes(period)) {
      onPeriodChange(newPeriods[1])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-zinc-900">Receita</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={granularity}
              onValueChange={(v) => handleGranularityChange(v as Granularity)}
            >
              <TabsList className="h-8">
                {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map((g) => (
                  <TabsTrigger key={g} value={g} className="px-3 text-xs">
                    {GRANULARITY_LABEL[g]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={period} onValueChange={(v) => onPeriodChange(v as TrendPeriod)}>
              <TabsList className="h-8">
                {activePeriods.map((p) => (
                  <TabsTrigger key={p} value={p} className="px-3 text-xs">
                    {PERIOD_LABELS[p] ?? p}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
        {data && (
          <p className="text-xs text-zinc-400">
            Total:{' '}
            <strong className="text-zinc-700">{formatCurrency(data.summary.total)}</strong>
            {' · '}
            {data.summary.totalOrders} pedidos
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
            Erro ao carregar dados.
          </div>
        )}
        {loading && (
          <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
            Carregando...
          </div>
        )}
        {!loading && !error && data && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatDate(v, granularity)}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                labelFormatter={(label) => formatDate(String(label), granularity)}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
