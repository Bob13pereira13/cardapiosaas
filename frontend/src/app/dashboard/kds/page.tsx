'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { Clock, Maximize2, RotateCw, Volume2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import {
  DELIVERY_LABEL,
  Order,
  OrderStatus,
  STATUS_LABEL,
  formatCurrency,
  getNextStatuses,
} from '@/lib/order-types'
import { cn } from '@/lib/utils'

type KitchenStatus = 'CONFIRMED' | 'IN_PREPARATION' | 'READY'

const KDS_COLUMNS: Array<{
  status: KitchenStatus
  title: string
  description: string
  action?: OrderStatus
}> = [
  {
    status: 'CONFIRMED',
    title: 'Confirmados',
    description: 'Pedidos aguardando inicio do preparo.',
    action: 'IN_PREPARATION',
  },
  {
    status: 'IN_PREPARATION',
    title: 'Em preparo',
    description: 'Pedidos sendo preparados pela cozinha.',
    action: 'READY',
  },
  {
    status: 'READY',
    title: 'Prontos',
    description: 'Pedidos prontos para retirada, mesa ou entrega.',
    action: 'OUT_FOR_DELIVERY',
  },
]

function playNewOrderSound() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContextCtor()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 980
    gain.gain.value = 0.06
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.22)
  } catch {
    // Audio is best-effort.
  }
}

function minutesSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
}

function actionFor(order: Order, preferred?: OrderStatus) {
  const next = getNextStatuses(order)
  if (preferred && next.includes(preferred)) return preferred
  return next.find((status) => status !== 'CANCELED') ?? null
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

export default function KdsPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [, setNowTick] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  const loadOrders = useCallback(async () => {
    const token = getToken()
    if (!token) {
      window.location.href = '/login'
      return
    }

    const dateFrom = new Date()
    dateFrom.setHours(0, 0, 0, 0)

    const params = new URLSearchParams({
      limit: '100',
      dateFrom: dateFrom.toISOString(),
    })

    const response = await fetch(`${API_URL}/orders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(response)) return
    const data = (await response.json()) as Order[]
    setOrders(data)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadOrders()
      setLoading(false)
    }

    void init()
  }, [loadOrders])

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick((value) => value + 1), 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const socket = io(API_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('order:new', (order: Order) => {
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)])
      toast.success(`Novo pedido #${order.orderNumber}`)
      if (!muted) playNewOrderSound()
    })
    socket.on('order:status-changed', ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, orderStatus: status } : order)),
      )
    })
    socket.on('order:payment-confirmed', ({ orderId }: { orderId: number }) => {
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, paymentStatus: 'PAID' } : order)),
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [muted])

  const kitchenOrders = useMemo(
    () =>
      orders
        .filter((order) => ['CONFIRMED', 'IN_PREPARATION', 'READY'].includes(order.orderStatus))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders],
  )

  const summary = useMemo(
    () => ({
      waiting: kitchenOrders.filter((order) => order.orderStatus === 'CONFIRMED').length,
      preparing: kitchenOrders.filter((order) => order.orderStatus === 'IN_PREPARATION').length,
      ready: kitchenOrders.filter((order) => order.orderStatus === 'READY').length,
    }),
    [kitchenOrders],
  )

  async function updateStatus(order: Order, status: OrderStatus) {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setUpdatingId(order.id)
    try {
      const response = await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderStatus: status }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Erro ao atualizar pedido.')
        return
      }

      setOrders((current) =>
        current.map((item) => (item.id === order.id ? { ...item, orderStatus: status } : item)),
      )
    } finally {
      setUpdatingId(null)
    }
  }

  function enterFullscreen() {
    void document.documentElement.requestFullscreen?.()
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="KDS"
        description="Tela de cozinha para acompanhar preparo e pedidos prontos em tempo real."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => setMuted((value) => !value)}>
              <Volume2 className="h-4 w-4" />
              {muted ? 'Som desligado' : 'Som ligado'}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => void loadOrders()}>
              <RotateCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button className="gap-2 bg-zinc-950 hover:bg-zinc-800" onClick={enterFullscreen}>
              <Maximize2 className="h-4 w-4" />
              Tela cheia
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Tempo real</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <span className={cn('h-2.5 w-2.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-zinc-300')} />
            {connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
        <KdsMetric label="Confirmados" value={summary.waiting} />
        <KdsMetric label="Em preparo" value={summary.preparing} />
        <KdsMetric label="Prontos" value={summary.ready} />
      </div>

      <div className="grid min-h-[calc(100vh-260px)] gap-4 xl:grid-cols-3">
        {KDS_COLUMNS.map((column) => {
          const columnOrders = kitchenOrders.filter((order) => order.orderStatus === column.status)
          return (
            <section key={column.status} className="flex min-h-96 flex-col rounded-lg border bg-white shadow-sm">
              <div className="border-b p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950">{column.title}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{column.description}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                    {columnOrders.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                {loading ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500">
                    Carregando pedidos...
                  </div>
                ) : columnOrders.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500">
                    Nenhum pedido nesta etapa.
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <KdsOrderCard
                      key={order.id}
                      order={order}
                      preferredAction={column.action}
                      updating={updatingId === order.id}
                      onStatusChange={(status) => updateStatus(order, status)}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function KdsMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-950">{value}</p>
    </div>
  )
}

function KdsOrderCard({
  order,
  preferredAction,
  updating,
  onStatusChange,
}: {
  order: Order
  preferredAction?: OrderStatus
  updating: boolean
  onStatusChange: (status: OrderStatus) => void
}) {
  const nextAction = actionFor(order, preferredAction)
  const elapsed = minutesSince(order.createdAt)
  const isLate = elapsed >= 25 && order.orderStatus !== 'READY'

  return (
    <article
      className={cn(
        'rounded-lg border bg-white p-4 shadow-sm',
        isLate && 'border-amber-300 bg-amber-50/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-zinc-950">
              #{String(order.orderNumber).padStart(3, '0')}
            </h3>
            <StatusBadge status={order.orderStatus} />
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-900">{order.customerName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-zinc-950">{formatCurrency(order.total)}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            {elapsed} min
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
          {DELIVERY_LABEL[order.deliveryType]}
        </span>
        {order.paymentStatus === 'PAID' && (
          <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
            Pago
          </span>
        )}
      </div>

      <div className="mt-4 divide-y rounded-lg border">
        {order.items.map((item) => (
          <div key={item.id} className="p-3">
            <p className="text-base font-bold text-zinc-950">
              {item.quantity}x {item.productNameSnapshot}
            </p>
            {(item.selectedOptions ?? []).length > 0 && (
              <div className="mt-2 space-y-1 text-sm text-zinc-600">
                {(item.selectedOptions ?? []).map((option) => (
                  <p key={`${item.id}-${option.optionGroupId}-${option.optionId}`}>
                    {option.optionGroupName ? `${option.optionGroupName}: ` : ''}{option.nome}
                  </p>
                ))}
              </div>
            )}
            {item.itemNotes && <p className="mt-1 text-sm text-amber-700">{item.itemNotes}</p>}
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {order.notes}
        </div>
      )}

      {nextAction && (
        <Button
          type="button"
          disabled={updating}
          className="mt-4 w-full bg-brand-red font-bold hover:bg-brand-red/90"
          onClick={() => onStatusChange(nextAction)}
        >
          {STATUS_LABEL[nextAction]}
        </Button>
      )}
    </article>
  )
}
