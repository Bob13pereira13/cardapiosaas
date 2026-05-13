'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TopProductsResponse, TrendPeriod } from '../hooks/useTrendsApi'
import { PeriodSelector } from './PeriodSelector'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TOP_PERIODS: TrendPeriod[] = [
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
  data: TopProductsResponse | null
  loading: boolean
  error: string | null
  orderBy: 'revenue' | 'quantity'
  onOrderByChange: (v: 'revenue' | 'quantity') => void
  period: TrendPeriod
  onPeriodChange: (p: TrendPeriod) => void
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2 animate-pulse">
      <div className="h-4 w-4 rounded bg-zinc-200" />
      <div className="h-4 flex-1 rounded bg-zinc-200" />
      <div className="h-4 w-20 rounded bg-zinc-200" />
    </div>
  )
}

export function TopProductsList({
  data,
  loading,
  error,
  orderBy,
  onOrderByChange,
  period,
  onPeriodChange,
}: Props) {
  const products = data?.products ?? []
  const maxValue =
    products.length > 0
      ? Math.max(
          1,
          ...products.map((p) =>
            orderBy === 'revenue' ? p.totalRevenue : p.totalQuantity,
          ),
        )
      : 1

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-zinc-900">
            Top Produtos
          </CardTitle>
          <Tabs
            value={orderBy}
            onValueChange={(v) => onOrderByChange(v as 'revenue' | 'quantity')}
          >
            <TabsList className="h-8">
              <TabsTrigger value="revenue" className="px-3 text-xs">
                Receita
              </TabsTrigger>
              <TabsTrigger value="quantity" className="px-3 text-xs">
                Qtd
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          periods={TOP_PERIODS}
        />
      </CardHeader>

      <CardContent className="flex-1">
        {error && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Erro ao carregar dados.
          </p>
        )}

        {loading && (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Nenhum produto no período.
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <ol className="space-y-2">
            {products.map((p, i) => {
              const value =
                orderBy === 'revenue' ? p.totalRevenue : p.totalQuantity
              const pct = Math.round((value / maxValue) * 100)
              const label =
                orderBy === 'revenue'
                  ? formatCurrency(p.totalRevenue)
                  : `${p.totalQuantity} un.`

              return (
                <li key={p.productId ?? i} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-right text-xs font-medium text-zinc-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate text-sm text-zinc-800"
                        title={p.name}
                      >
                        {p.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-zinc-600">
                        {label}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-red-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
