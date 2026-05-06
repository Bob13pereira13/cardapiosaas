'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ReceiptText,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { Order, OrderStatus, STATUS_LABEL, formatCurrency } from '@/lib/order-types'
import { cn } from '@/lib/utils'

type Customer = {
  id: number
  name: string
  createdAt?: string
  ordersCount: number
  totalSpent: number
}

type Account = {
  subscriptionStatus?: string
  trialEndsAt?: string | null
  aberto?: boolean
}

type Metric = {
  label: string
  value: string
  variation: number
  icon: typeof ReceiptText
}

const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function isSameDay(value: string | undefined, target: Date) {
  if (!value) return false
  return startOfDay(new Date(value)).getTime() === startOfDay(target).getTime()
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function trialDaysLeft(trialEndsAt?: string | null) {
  if (!trialEndsAt) return null
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function DashboardInicioPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    const headers = { Authorization: `Bearer ${token}` }
    const [ordersResponse, customersResponse, accountResponse] = await Promise.all([
      fetch(`${API_URL}/orders?limit=100`, { headers }),
      fetch(`${API_URL}/customers`, { headers }),
      fetch(`${API_URL}/users/me`, { headers }),
    ])

    if (
      handleUnauthorized(ordersResponse) ||
      handleUnauthorized(customersResponse) ||
      handleUnauthorized(accountResponse)
    ) {
      return
    }

    const [ordersData, customersData, accountData] = await Promise.all([
      ordersResponse.json() as Promise<Order[]>,
      customersResponse.json() as Promise<Customer[]>,
      accountResponse.json() as Promise<Account>,
    ])

    setOrders(ordersData)
    setCustomers(customersData)
    setAccount(accountData)
  }, [router])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadData()
      setLoading(false)
    }

    void init()
  }, [loadData])

  const today = useMemo(() => new Date(), [])
  const yesterday = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date
  }, [])

  const todayOrders = orders.filter((order) => isSameDay(order.createdAt, today))
  const yesterdayOrders = orders.filter((order) => isSameDay(order.createdAt, yesterday))
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
  const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + order.total, 0)
  const todayAverage = todayOrders.length ? todayRevenue / todayOrders.length : 0
  const yesterdayAverage = yesterdayOrders.length
    ? yesterdayRevenue / yesterdayOrders.length
    : 0
  const todayCustomers = customers.filter((customer) => isSameDay(customer.createdAt, today))
  const yesterdayCustomers = customers.filter((customer) =>
    isSameDay(customer.createdAt, yesterday),
  )

  const metrics: Metric[] = [
    {
      label: 'Pedidos hoje',
      value: String(todayOrders.length),
      variation: percentChange(todayOrders.length, yesterdayOrders.length),
      icon: ReceiptText,
    },
    {
      label: 'Faturamento hoje',
      value: formatCurrency(todayRevenue),
      variation: percentChange(todayRevenue, yesterdayRevenue),
      icon: Wallet,
    },
    {
      label: 'Ticket medio',
      value: formatCurrency(todayAverage),
      variation: percentChange(todayAverage, yesterdayAverage),
      icon: ShoppingBag,
    },
    {
      label: 'Clientes novos',
      value: String(todayCustomers.length),
      variation: percentChange(todayCustomers.length, yesterdayCustomers.length),
      icon: Users,
    },
  ]

  const weeklyOrders = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const count = orders.filter((order) => isSameDay(order.createdAt, date)).length
      return {
        label: WEEKDAY.format(date).replace('.', ''),
        count,
      }
    })
    const max = Math.max(...days.map((day) => day.count), 1)
    return days.map((day) => ({ ...day, height: Math.max(8, (day.count / max) * 100) }))
  }, [orders])

  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; revenue: number }>()
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const current = totals.get(item.productNameSnapshot) ?? {
          name: item.productNameSnapshot,
          quantity: 0,
          revenue: 0,
        }
        current.quantity += item.quantity
        current.revenue += item.itemTotal
        totals.set(item.productNameSnapshot, current)
      })
    })

    const list = Array.from(totals.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
    const max = Math.max(...list.map((item) => item.quantity), 1)
    return list.map((item) => ({ ...item, progress: (item.quantity / max) * 100 }))
  }, [orders])

  const latestOrders = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const daysLeft = trialDaysLeft(account?.trialEndsAt)
  const showTrialBanner = account?.subscriptionStatus === 'TRIAL' && daysLeft !== null && daysLeft <= 3
  const showOverdueBanner = account?.subscriptionStatus === 'OVERDUE'
  const showClosedBanner = account?.aberto === false

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Inicio"
        description="Visao geral do restaurante, vendas e operacao do dia."
        actions={
          <Button asChild className="bg-brand-red hover:bg-brand-red/90">
            <Link href="/dashboard/pedidos/novo">Novo pedido</Link>
          </Button>
        }
      />

      {showTrialBanner && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold">{daysLeft} dias restantes no periodo gratis</p>
            <p className="mt-1 text-sm text-amber-800">
              Assine para manter pedidos, clientes e cardapio ativos apos o trial.
            </p>
          </div>
          <Button asChild className="bg-brand-yellow text-zinc-950 hover:bg-brand-yellow/90">
            <Link href="/dashboard/assinatura">Assinar agora</Link>
          </Button>
        </div>
      )}

      {showOverdueBanner && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
          <p className="text-sm font-bold">Assinatura vencida</p>
          <p className="mt-1 text-sm text-red-800">Regularize sua assinatura para manter o cardápio e os pedidos ativos.</p>
        </div>
      )}

      {showClosedBanner && (
        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-zinc-800 shadow-sm">
          <p className="text-sm font-bold">Loja fechada manualmente</p>
          <p className="mt-1 text-sm text-zinc-600">Clientes não poderão fazer novos pedidos enquanto a loja estiver fechada.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} loading={loading} />
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Pedidos dos ultimos 7 dias</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Volume diario de pedidos recebidos.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-3 rounded-lg bg-zinc-50 p-4">
              {weeklyOrders.map((day) => (
                <div key={day.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-brand-red transition-all"
                      style={{ height: `${day.height}%` }}
                      title={`${day.count} pedidos`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-950">{day.count}</p>
                    <p className="text-xs capitalize text-zinc-500">{day.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produtos mais vendidos</CardTitle>
            <p className="text-sm text-zinc-500">Top 5 por quantidade vendida.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {topProducts.length === 0 ? (
              <EmptyState text="Sem produtos vendidos ainda." />
            ) : (
              topProducts.map((product, index) => (
                <div key={product.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-950">
                        {index + 1}. {product.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {product.quantity} vendidos · {formatCurrency(product.revenue)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-zinc-500">
                      {Math.round(product.progress)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-brand-red"
                      style={{ width: `${product.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ultimos pedidos</CardTitle>
            <p className="text-sm text-zinc-500">Pedidos recentes com status atual.</p>
          </CardHeader>
          <CardContent>
            {latestOrders.length === 0 ? (
              <EmptyState text="Nenhum pedido recente." />
            ) : (
              <div className="divide-y rounded-lg border">
                {latestOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/pedidos/${order.id}`}
                    className="flex items-center justify-between gap-3 p-3 transition hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-950">
                        #{String(order.orderNumber).padStart(3, '0')} · {order.customerName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{formatTime(order.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold text-zinc-950">
                        {formatCurrency(order.total)}
                      </span>
                      <StatusBadge status={order.orderStatus as OrderStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo operacional</CardTitle>
            <p className="text-sm text-zinc-500">Distribuicao dos pedidos em aberto.</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(['PENDING', 'CONFIRMED', 'IN_PREPARATION', 'READY'] as OrderStatus[]).map(
              (status) => {
                const count = orders.filter((order) => order.orderStatus === status).length
                return (
                  <div key={status} className="rounded-lg border bg-zinc-50 p-4">
                    <StatusBadge status={status} />
                    <p className="mt-3 text-2xl font-black text-zinc-950">{count}</p>
                    <p className="text-xs text-zinc-500">{STATUS_LABEL[status]}</p>
                  </div>
                )
              },
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ metric, loading }: { metric: Metric; loading: boolean }) {
  const Icon = metric.icon
  const positive = metric.variation >= 0

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-black text-zinc-950">
              {loading ? '-' : metric.value}
            </p>
          </div>
          <div className="rounded-lg bg-brand-red-soft p-2 text-brand-red">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div
          className={cn(
            'mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
            positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
          )}
        >
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(metric.variation)}% vs ontem
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  )
}
