'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, BarChart2, Clock, CreditCard, ShoppingBag, TrendingUp } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Period = 'TODAY' | 'WEEK' | 'MONTH'
type Summary = {
  totalRevenue: number
  totalOrders: number
  averageTicket: number
  cancelRate: number
  topProducts: { nome: string; count: number; revenue: number }[]
  topCategories: { nome: string; count: number }[]
  paymentMethods: { method: string; count: number; total: number }[]
  dailySeries: { date: string; orders: number; revenue: number }[]
  peakHours: { hour: number; count: number }[]
}

const periods: Array<{ key: Period; label: string }> = [
  { key: 'TODAY', label: 'Hoje' },
  { key: 'WEEK', label: '7 dias' },
  { key: 'MONTH', label: '30 dias' },
]

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function MetricCard({ title, value, icon: Icon, up = true }: { title: string; value: string; icon: typeof BarChart2; up?: boolean }) {
  const TrendIcon = up ? ArrowUp : ArrowDown
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand-red-soft p-2 text-brand-red"><Icon className="h-4 w-4" /></span>
        <span className={cn('flex items-center gap-1 text-xs font-medium', up ? 'text-emerald-600' : 'text-red-600')}>
          <TrendIcon className="h-3 w-3" /> {up ? '+8%' : '-3%'}
        </span>
      </div>
      <p className="mt-4 text-sm text-zinc-500">{title}</p>
      <strong className="mt-1 block text-2xl text-zinc-950">{value}</strong>
    </div>
  )
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('WEEK')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const token = getToken()
      if (!token) { window.location.href = '/login'; return }
      const res = await fetch(`${API_URL}/reports/summary?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleUnauthorized(res)) return
      if (res.ok) setSummary(await res.json())
      setLoading(false)
    }
    void load()
  }, [period])

  const maxRevenue = useMemo(() => Math.max(1, ...(summary?.dailySeries.map((item) => item.revenue) ?? [1])), [summary])
  const totalPaymentCount = summary?.paymentMethods.reduce((sum, item) => sum + item.count, 0) ?? 1
  const maxHour = Math.max(1, ...(summary?.peakHours.map((item) => item.count) ?? [1]))

  return (
    <div className="space-y-5">
      <PageHeader title="Relatórios" description="Acompanhe vendas, horários de pico e produtos mais vendidos." />

      <div className="flex flex-wrap gap-2">
        {periods.map((item) => (
          <Button key={item.key} type="button" variant={period === item.key ? 'default' : 'outline'} className={period === item.key ? 'bg-brand-red hover:bg-brand-red/90' : ''} onClick={() => setPeriod(item.key)}>
            {item.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-lg bg-zinc-100" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Receita total" value={fmt(summary?.totalRevenue ?? 0)} icon={TrendingUp} />
          <MetricCard title="Pedidos" value={String(summary?.totalOrders ?? 0)} icon={ShoppingBag} />
          <MetricCard title="Ticket médio" value={fmt(summary?.averageTicket ?? 0)} icon={CreditCard} />
          <MetricCard title="Taxa de cancelamento" value={`${(((summary?.cancelRate ?? 0) * 100)).toFixed(1)}%`} icon={BarChart2} up={false} />
        </div>
      )}

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Últimos dias</h2>
        <div className="mt-5 flex h-56 items-end gap-3">
          {(summary?.dailySeries ?? []).map((item) => (
            <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full items-end justify-center">
                <div className="w-full rounded-t bg-brand-red transition hover:bg-brand-red/80" style={{ height: `${Math.max(8, (item.revenue / maxRevenue) * 180)}px` }} />
                <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded bg-zinc-950 px-2 py-1 text-xs text-white group-hover:block">{fmt(item.revenue)}</div>
              </div>
              <span className="truncate text-[11px] text-zinc-500">{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Produtos mais vendidos</h2>
          <div className="space-y-3">
            {(summary?.topProducts ?? []).map((product, index) => (
              <div key={product.nome}>
                <div className="flex justify-between text-sm"><span>{index + 1}. {product.nome}</span><strong>{product.count} vendas</strong></div>
                <div className="mt-2 h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-brand-red" style={{ width: `${Math.min(100, product.count * 10)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Formas de pagamento</h2>
          <div className="space-y-3">
            {(summary?.paymentMethods ?? []).map((method) => (
              <div key={method.method} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand-red" /> {method.method}</span>
                <span>{method.count} ({Math.round((method.count / totalPaymentCount) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900"><Clock className="h-4 w-4" /> Horários de pico</h2>
        <div className="grid grid-cols-12 gap-2">
          {(summary?.peakHours ?? []).map((hour) => (
            <div key={hour.hour} className="rounded p-2 text-center text-[11px]" style={{ backgroundColor: hour.count ? `rgba(230,57,70,${0.15 + (hour.count / maxHour) * 0.65})` : '#f4f4f5' }}>
              {String(hour.hour).padStart(2, '0')}h
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
