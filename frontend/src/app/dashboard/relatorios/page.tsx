'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { PeriodSelector } from './components/PeriodSelector'
import { SummaryCards } from './components/SummaryCards'
import { RevenueChart } from './components/RevenueChart'
import {
  useTrendsSummary,
  useTrendsRevenue,
  type Granularity,
  type TrendPeriod,
} from './hooks/useTrendsApi'
import { useRouter } from 'next/navigation'

export default function RelatoriosPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<TrendPeriod>('current_month')
  const [revenueGranularity, setRevenueGranularity] = useState<Granularity>('day')
  const [revenuePeriod, setRevenuePeriod] = useState<TrendPeriod>('last_30d')

  const summary = useTrendsSummary(period)
  const revenue = useTrendsRevenue(revenueGranularity, revenuePeriod)

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
    </div>
  )
}
