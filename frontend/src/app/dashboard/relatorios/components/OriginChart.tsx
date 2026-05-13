'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OriginResponse, TrendPeriod } from '../hooks/useTrendsApi'
import { PeriodSelector } from './PeriodSelector'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ORIGIN_COLORS: Record<string, string> = {
  WEBSITE: '#dc2626',
  IFOOD: '#EA1D2C',
  MANUAL: '#6B7280',
  WHATSAPP_BOT: '#25D366',
  RAPPI_99: '#FF6600',
  UBER_EATS: '#06C167',
}

const FALLBACK_COLORS = [
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#94a3b8',
]

const ORIGIN_LABELS: Record<string, string> = {
  WEBSITE: 'Site próprio',
  IFOOD: 'iFood',
  MANUAL: 'Manual',
  WHATSAPP_BOT: 'WhatsApp Bot',
  RAPPI_99: 'Rappi',
  UBER_EATS: 'Uber Eats',
}

function originColor(origin: string, index: number): string {
  return ORIGIN_COLORS[origin] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin
}

const ORIGIN_PERIODS: TrendPeriod[] = [
  'current_week',
  'current_month',
  'current_year',
  'last_7d',
  'last_30d',
  'last_90d',
  'last_12m',
  'last_24m',
]

type Props = {
  data: OriginResponse | null
  loading: boolean
  error: string | null
  period: TrendPeriod
  onPeriodChange: (p: TrendPeriod) => void
}

export function OriginChart({ data, loading, error, period, onPeriodChange }: Props) {
  const origins = data?.origins ?? []

  const chartData = origins.map((o, i) => ({
    name: originLabel(o.origin),
    value: o.revenue,
    orders: o.orders,
    percentage: o.percentage,
    color: originColor(o.origin, i),
  }))

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-900">
            Origem dos Pedidos
          </CardTitle>
        </div>
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          periods={ORIGIN_PERIODS}
        />
      </CardHeader>

      <CardContent className="flex-1">
        {error && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Erro ao carregar dados.
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="h-40 w-40 rounded-full bg-zinc-200" />
            <div className="w-full space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-zinc-200" />
              ))}
            </div>
          </div>
        )}

        {!loading && !error && origins.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Nenhum pedido no período.
          </p>
        )}

        {!loading && !error && origins.length > 0 && (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>

            <ul className="space-y-2">
              {chartData.map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate text-zinc-700">{entry.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                    <span>{entry.orders} pedidos</span>
                    <span className="font-medium text-zinc-700">
                      {entry.percentage.toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {data && (
              <p className="border-t pt-2 text-right text-xs text-zinc-400">
                Total:{' '}
                <strong className="text-zinc-600">
                  {formatCurrency(data.totalRevenue)}
                </strong>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
