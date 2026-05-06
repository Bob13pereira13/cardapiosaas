'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ChefHat, ClipboardList, Package, Truck, Utensils } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { cn } from '@/lib/utils'

type OrderItem = {
  id: number
  productNameSnapshot: string
  quantity: number
  itemTotal: number
}

type OrderTracking = {
  orderNumber: number
  orderStatus: string
  items: OrderItem[]
  total: number
  deliveryType: string
}

const STEPS = [
  { key: 'PENDING', label: 'Pedido recebido', icon: ClipboardList },
  { key: 'CONFIRMED', label: 'Confirmado', icon: CheckCircle2 },
  { key: 'IN_PREPARATION', label: 'Em preparo', icon: ChefHat },
  { key: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega', icon: Truck },
  { key: 'DELIVERED', label: 'Entregue', icon: Package },
]

const STATUS_ORDER = STEPS.map((s) => s.key)

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AcompanharPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextUpdate, setNextUpdate] = useState(10)

  async function fetchStatus() {
    const res = await fetch(`${API_URL}/public/order/${orderId}/status`)
    if (!res.ok) return
    const data = (await res.json()) as OrderTracking
    setOrder(data)
    setNextUpdate(10)
  }

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    if (order?.orderStatus === 'DELIVERED' || order?.orderStatus === 'CANCELED') return
    const interval = setInterval(() => { void fetchStatus() }, 10000)
    const countdown = setInterval(() => setNextUpdate((prev) => (prev <= 1 ? 10 : prev - 1)), 1000)
    return () => {
      clearInterval(interval)
      clearInterval(countdown)
    }
  }, [order?.orderStatus, orderId])

  const currentIndex = order ? STATUS_ORDER.indexOf(order.orderStatus) : -1
  const canceled = order?.orderStatus === 'CANCELED'

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">
        {loading && (
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded bg-zinc-100" />
            <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
          </div>
        )}

        {order && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <p className="text-xs text-zinc-500">Acompanhando pedido</p>
              <p className="text-2xl font-bold text-zinc-950">#{order.orderNumber}</p>
              {!canceled && order.orderStatus !== 'DELIVERED' && (
                <p className="mt-1 text-xs text-zinc-400">Atualizando em {nextUpdate}s...</p>
              )}
            </div>

            {canceled ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-center text-sm font-medium text-red-700">
                Pedido cancelado.
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <ul className="space-y-4">
                  {STEPS.map((step, index) => {
                    const done = index < currentIndex
                    const active = index === currentIndex
                    const Icon = step.icon
                    return (
                      <li key={step.key} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                              active && 'animate-pulse bg-brand-red text-white',
                              done && 'bg-emerald-500 text-white',
                              !active && !done && 'bg-zinc-100 text-zinc-400',
                            )}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          {index < STEPS.length - 1 && (
                            <div className={cn('mt-1 h-8 w-0.5', done ? 'bg-emerald-500' : 'bg-zinc-100')} />
                          )}
                        </div>
                        <div className="pt-0.5">
                          <p className={cn('text-sm font-medium', active ? 'text-brand-red' : done ? 'text-zinc-900' : 'text-zinc-400')}>
                            {step.label}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {order.orderStatus === 'DELIVERED' && (
                  <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
                    Pedido entregue! Obrigado.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Itens</h2>
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm text-zinc-700">
                    <span><span className="font-medium">{item.quantity}x</span> {item.productNameSnapshot}</span>
                    <span className="font-medium">{fmt(item.itemTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t pt-3 flex justify-between text-sm font-bold text-zinc-950">
                <span>Total</span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
