'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Plus, Search } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import {
  DeliveryType,
  Order,
  OrderStatus,
  PaymentMethod,
  ProductOption,
  STATUS_LABEL,
  formatCurrency,
} from '@/lib/order-types'
import { PageHeader } from '@/components/admin/PageHeader'
import { OrderListItem } from '@/components/admin/OrderListItem'
import { OrderDetailPanel } from '@/components/admin/OrderDetailPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useOrderUpdates } from '@/hooks/useOrderUpdates'
import { useActiveMarketplaces } from '@/hooks/useActiveMarketplaces'
import { OriginFilter, OriginKey } from './components/OriginFilter'
import { StatusFilter, StatusGroup, STATUS_GROUPS } from './components/StatusFilter'
import { PeriodFilter, PeriodFilterValue } from './components/PeriodFilter'

// TODO: backend GET /orders/summary com agregações byOrigin/byStatus
// pra remover dependência de fetch full + cálculo client-side

const TOO_MANY_THRESHOLD = 500

type ManualItem = { productId: string; quantity: number; itemNotes: string }
const INITIAL_MANUAL_ITEM: ManualItem = { productId: '', quantity: 1, itemNotes: '' }

function getDateFrom(period: PeriodFilterValue): string | null {
  const date = new Date()
  if (period === 'today') {
    date.setHours(0, 0, 0, 0)
    return date.toISOString()
  }
  if (period === 'last_week') {
    date.setDate(date.getDate() - 7)
    return date.toISOString()
  }
  if (period === 'last_month') {
    date.setMonth(date.getMonth() - 1)
    return date.toISOString()
  }
  return null // custom: sem restrição de data
}

function playNewOrderSound() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContextCtor()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.value = 0.05
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.16)
  } catch {
    // Audio is best-effort.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [originFilter, setOriginFilter] = useState<OriginKey | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusGroup | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('today')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [tooMany, setTooMany] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set())
  const [manualOpen, setManualOpen] = useState(false)
  const [creatingManual, setCreatingManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualDeliveryType, setManualDeliveryType] = useState<DeliveryType>('PICKUP')
  const [manualPayment, setManualPayment] = useState<PaymentMethod>('CASH')
  const [manualNotes, setManualNotes] = useState('')
  const [manualStreet, setManualStreet] = useState('')
  const [manualNumber, setManualNumber] = useState('')
  const [manualNeighborhood, setManualNeighborhood] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualZipcode, setManualZipcode] = useState('')
  const [manualItems, setManualItems] = useState<ManualItem[]>([INITIAL_MANUAL_ITEM])

  const { asMap: activeMarketplaces } = useActiveMarketplaces()

  const { connected } = useOrderUpdates({
    onNew: (order) => {
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)])
      setHighlightedIds((current) => new Set(current).add(order.id))
      toast.success(`Novo pedido #${order.orderNumber}`, {
        description: `${order.customerName} - ${formatCurrency(order.total)}`,
      })
      playNewOrderSound()
      window.setTimeout(() => {
        setHighlightedIds((current) => {
          const next = new Set(current)
          next.delete(order.id)
          return next
        })
      }, 9000)
    },
    onStatusChanged: ({ orderId, status }) => {
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, orderStatus: status } : order)),
      )
    },
    onPaymentConfirmed: ({ orderId }) => {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, paymentStatus: 'PAID' } : order,
        ),
      )
    },
    onWhatsappPrompt: ({ customerPhone, customerName }) => {
      toast(`Enviar confirmacao de entrega para ${customerName} no WhatsApp?`, {
        action: {
          label: 'Sim',
          onClick: () => {
            const phone = customerPhone.replace(/\D/g, '')
            window.open(`https://wa.me/${phone}?text=Seu+pedido+foi+entregue!`, '_blank')
          },
        },
      })
    },
  })

  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null

  const loadOrders = useCallback(async () => {
    const token = getToken()
    if (!token) {
      window.location.href = '/login'
      return
    }

    const params = new URLSearchParams({ limit: String(TOO_MANY_THRESHOLD) })
    const dateFrom = getDateFrom(periodFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)

    const response = await fetch(`${API_URL}/orders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(response)) return
    const data = (await response.json()) as Order[]

    if (data.length >= TOO_MANY_THRESHOLD) {
      setTooMany(true)
      setOrders([])
      setSelectedId(null)
    } else {
      setTooMany(false)
      setOrders(data)
      setSelectedId((current) => current ?? data[0]?.id ?? null)
    }
  }, [periodFilter])

  const loadProducts = useCallback(async () => {
    const token = getToken()
    if (!token) return

    const response = await fetch(`${API_URL}/products?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(response)) return
    const data = (await response.json()) as { data?: ProductOption[] }
    setProducts((data.data ?? []).filter((product) => product.disponivel !== false))
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadOrders(), loadProducts()])
      setLoading(false)
    }
    void init()
  }, [loadOrders, loadProducts])

  // Origin counts from all fetched orders (regardless of filters)
  const originCounts = useMemo(() => {
    const counts: Record<string, number> = { _all: orders.length }
    for (const order of orders) {
      counts[order.origin] = (counts[order.origin] ?? 0) + 1
    }
    return counts
  }, [orders])

  // Orders narrowed by selected origin
  const ordersByOrigin = useMemo(() => {
    if (originFilter === null) return orders
    return orders.filter((o) => o.origin === originFilter)
  }, [orders, originFilter])

  // Status counts from origin-filtered orders
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { _all: ordersByOrigin.length }
    for (const order of ordersByOrigin) {
      counts[order.orderStatus] = (counts[order.orderStatus] ?? 0) + 1
    }
    return counts as Record<OrderStatus | '_all', number>
  }, [ordersByOrigin])

  const filteredOrders = useMemo(() => {
    const group = statusFilter ? STATUS_GROUPS.find((g) => g.key === statusFilter) : null
    const allowedStatuses = group?.statuses
    const q = search.trim().toLowerCase()
    return ordersByOrigin.filter((order) => {
      if (allowedStatuses && !allowedStatuses.includes(order.orderStatus)) return false
      if (!q) return true
      return (
        order.customerName.toLowerCase().includes(q) ||
        String(order.orderNumber).includes(q) ||
        order.customerPhone.includes(q)
      )
    })
  }, [ordersByOrigin, statusFilter, search])

  const summary = useMemo(() => {
    const total = filteredOrders.reduce((sum, order) => sum + order.total, 0)
    return {
      count: filteredOrders.length,
      revenue: total,
      average: filteredOrders.length ? total / filteredOrders.length : 0,
    }
  }, [filteredOrders])

  async function updateStatus(order: Order, status: OrderStatus) {
    const token = getToken()
    if (!token) return

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
      toast.success(`Pedido #${order.orderNumber}: ${STATUS_LABEL[status]}`)
    } finally {
      setUpdatingId(null)
    }
  }

  function updateManualItem(index: number, patch: Partial<ManualItem>) {
    setManualItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  async function createManualOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getToken()
    if (!token) return

    const items = manualItems
      .filter((item) => item.productId)
      .map((item) => ({
        productId: Number(item.productId),
        quantity: item.quantity,
        itemNotes: item.itemNotes || undefined,
      }))

    if (!manualName.trim() || !manualPhone.trim() || items.length === 0) {
      toast.error('Informe cliente, telefone e pelo menos um item.')
      return
    }

    const body: Record<string, unknown> = {
      customerName: manualName.trim(),
      customerPhone: manualPhone.replace(/[^\d+]/g, ''),
      deliveryType: manualDeliveryType,
      paymentMethod: manualPayment,
      notes: manualNotes.trim() || undefined,
      items,
    }

    if (manualDeliveryType === 'DELIVERY') {
      body.customerAddress = {
        street: manualStreet.trim(),
        number: manualNumber.trim(),
        neighborhood: manualNeighborhood.trim(),
        city: manualCity.trim(),
        zipcode: manualZipcode.trim(),
      }
    }

    setCreatingManual(true)
    try {
      const response = await fetch(`${API_URL}/orders/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar pedido manual.')
        return
      }
      const order = (await response.json()) as Order
      setOrders((current) => [order, ...current])
      setSelectedId(order.id)
      setManualOpen(false)
      setManualName('')
      setManualPhone('')
      setManualNotes('')
      setManualItems([INITIAL_MANUAL_ITEM])
      toast.success(`Pedido manual #${order.orderNumber} criado`)
    } finally {
      setCreatingManual(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Toaster richColors position="top-right" />
      <div className="space-y-5">
        <PageHeader
          title="Pedidos"
          description="Acompanhe pedidos por origem, status e periodo."
          actions={
            <>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button asChild className="gap-2 bg-brand-red hover:bg-brand-red/90">
                <Link href="/dashboard/pedidos/novo">
                  <Plus className="h-4 w-4" />
                  Novo pedido
                </Link>
              </Button>
            </>
          }
        />

        {tooMany && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Muitos pedidos no período. Refine o filtro de período ou peça paginação.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, telefone ou numero"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className={cn('h-2 w-2 rounded-full', connected ? 'bg-brand-red' : 'bg-zinc-300')}
                />
                {connected ? 'Tempo real ativo' : 'Tempo real desconectado'}
              </div>
              <PeriodFilter value={periodFilter} onChange={setPeriodFilter} />
            </div>
          </div>

          <OriginFilter
            counts={originCounts}
            selected={originFilter}
            onChange={setOriginFilter}
            activeMarketplaces={activeMarketplaces}
          />

          <StatusFilter counts={statusCounts} selected={statusFilter} onChange={setStatusFilter} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[35%_1fr]">
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-lg border bg-white p-8 text-center text-sm text-zinc-500">
                Carregando pedidos...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center text-sm text-zinc-500">
                Nenhum pedido encontrado.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <OrderListItem
                  key={order.id}
                  order={order}
                  selected={selectedId === order.id}
                  highlighted={highlightedIds.has(order.id)}
                  onClick={() => {
                    setSelectedId(order.id)
                    setMobileDetailOpen(true)
                  }}
                />
              ))
            )}
          </div>

          <div className="hidden lg:block">
            <OrderDetailPanel
              order={selectedOrder}
              updating={updatingId === selectedOrder?.id}
              onStatusChange={(status) => selectedOrder && updateStatus(selectedOrder, status)}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border bg-white p-4 text-sm shadow-sm md:grid-cols-3">
          <div>
            <p className="text-zinc-500">Total de pedidos</p>
            <p className="mt-1 text-xl font-bold text-zinc-950">{summary.count}</p>
          </div>
          <div>
            <p className="text-zinc-500">Faturamento</p>
            <p className="mt-1 text-xl font-bold text-zinc-950">{formatCurrency(summary.revenue)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Ticket medio</p>
            <p className="mt-1 text-xl font-bold text-zinc-950">{formatCurrency(summary.average)}</p>
          </div>
        </div>
      </div>

      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-xl lg:hidden">
          <OrderDetailPanel
            order={selectedOrder}
            updating={updatingId === selectedOrder?.id}
            onStatusChange={(status) => selectedOrder && updateStatus(selectedOrder, status)}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo pedido manual</DialogTitle>
            <DialogDescription>
              Registre pedidos de balcao, telefone ou atendimento interno.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={createManualOrder}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome cliente</Label>
                <Input
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  value={manualDeliveryType}
                  onChange={(event) => setManualDeliveryType(event.target.value as DeliveryType)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="DELIVERY">Entrega</option>
                  <option value="PICKUP">Retirada</option>
                  <option value="DINE_IN">Mesa</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Pagamento</Label>
                <select
                  value={manualPayment}
                  onChange={(event) => setManualPayment(event.target.value as PaymentMethod)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="CASH">Dinheiro</option>
                  <option value="PIX">PIX presencial</option>
                  <option value="CREDIT_CARD">Cartao de credito</option>
                  <option value="DEBIT_CARD">Cartao de debito</option>
                </select>
              </div>
            </div>

            {manualDeliveryType === 'DELIVERY' && (
              <div className="grid gap-3 rounded-lg bg-zinc-50 p-3 md:grid-cols-2">
                <Input
                  placeholder="Rua"
                  value={manualStreet}
                  onChange={(event) => setManualStreet(event.target.value)}
                />
                <Input
                  placeholder="Numero"
                  value={manualNumber}
                  onChange={(event) => setManualNumber(event.target.value)}
                />
                <Input
                  placeholder="Bairro"
                  value={manualNeighborhood}
                  onChange={(event) => setManualNeighborhood(event.target.value)}
                />
                <Input
                  placeholder="Cidade"
                  value={manualCity}
                  onChange={(event) => setManualCity(event.target.value)}
                />
                <Input
                  placeholder="CEP"
                  value={manualZipcode}
                  onChange={(event) => setManualZipcode(event.target.value)}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualItems((current) => [...current, INITIAL_MANUAL_ITEM])}
                >
                  Adicionar item
                </Button>
              </div>
              {manualItems.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_90px_1fr_auto]"
                >
                  <select
                    value={item.productId}
                    onChange={(event) => updateManualItem(index, { productId: event.target.value })}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Produto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.nome} - {formatCurrency(product.preco)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateManualItem(index, { quantity: Number(event.target.value) || 1 })
                    }
                  />
                  <Input
                    placeholder="Observacao do item"
                    value={item.itemNotes}
                    onChange={(event) => updateManualItem(index, { itemNotes: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={manualItems.length === 1}
                    onClick={() =>
                      setManualItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Observacoes gerais</Label>
              <Textarea
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creatingManual}
                className="bg-brand-red hover:bg-brand-red/90"
              >
                {creatingManual ? 'Criando...' : 'Criar pedido'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
