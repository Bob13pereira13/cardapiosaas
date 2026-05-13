'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { PeriodSelector } from './components/PeriodSelector'
import { SummaryCards } from './components/SummaryCards'
import { RevenueChart } from './components/RevenueChart'
import { TopProductsList } from './components/TopProductsList'
import { OriginChart } from './components/OriginChart'
import {
  useTrendsSummary,
  useTrendsRevenue,
  useTrendsTopProducts,
  useTrendsOrigin,
  type Granularity,
  type TrendPeriod,
} from './hooks/useTrendsApi'

export default function RelatoriosPage() {
  const router = useRouter()

  // Global period controls summary cards
  const [period, setPeriod] = useState<TrendPeriod>('current_month')

  // Revenue chart has its own granularity + period
  const [revenueGranularity, setRevenueGranularity] = useState<Granularity>('day')
  const [revenuePeriod, setRevenuePeriod] = useState<TrendPeriod>('last_30d')

  // Top products has its own period + orderBy
  const [topPeriod, setTopPeriod] = useState<TrendPeriod>('last_30d')
  const [topOrderBy, setTopOrderBy] = useState<'revenue' | 'quantity'>('revenue')

  // Origin chart has its own period
  const [originPeriod, setOriginPeriod] = useState<TrendPeriod>('last_30d')

  const summary = useTrendsSummary(period)
  const revenue = useTrendsRevenue(revenueGranularity, revenuePeriod)
  const topProducts = useTrendsTopProducts(topPeriod, 8, topOrderBy)
  const origin = useTrendsOrigin(originPeriod)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Tendências de vendas, receita e clientes."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/relatorios/avancado')}
          >
            Relatórios Avançados
          </Button>
        }
      />

      <PeriodSelector
        value={period}
        onChange={setPeriod}
        from={summary.data?.from}
        to={summary.data?.to}
      />

      <SummaryCards
        data={summary.data}
        loading={summary.loading}
        error={summary.error}
      />

      <RevenueChart
        data={revenue.data}
        loading={revenue.loading}
        error={revenue.error}
        granularity={revenueGranularity}
        period={revenuePeriod}
        onGranularityChange={setRevenueGranularity}
        onPeriodChange={setRevenuePeriod}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsList
          data={topProducts.data}
          loading={topProducts.loading}
          error={topProducts.error}
          orderBy={topOrderBy}
          onOrderByChange={setTopOrderBy}
          period={topPeriod}
          onPeriodChange={setTopPeriod}
        />

        <OriginChart
          data={origin.data}
          loading={origin.loading}
          error={origin.error}
          period={originPeriod}
          onPeriodChange={setOriginPeriod}
        />
      </div>
    </div>
  )
}
