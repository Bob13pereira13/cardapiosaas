'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PackageX, Utensils } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type OrderItem = {
  id: number
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  itemTotal: number
}

type Order = {
  id: number
  orderNumber: number
  orderStatus: string
  customerName: string
  deliveryType: string
  customerAddress: Record<string, string> | null
  subtotal: number
  deliveryFee: number
  total: number
  paymentStatus: string
  createdAt?: string
  items: OrderItem[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-zinc-100 text-zinc-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PREPARATION: 'bg-yellow-100 text-yellow-700',
  READY: 'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELED: 'bg-red-100 text-red-700',
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PedidoPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/public/order/${orderId}`)
      .then((res) => {
        if (!res.ok) { setNotFound(true); return null }
        return res.json() as Promise<Order>
      })
      .then((data) => { if (data) setOrder(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>

      <main className="mx-auto max-w-[480px] px-4 py-8">
        {loading && (
          <div className="space-y-3">
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
            <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />
          </div>
        )}

        {notFound && (
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <PackageX className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-lg font-semibold text-zinc-900">Pedido não encontrado</p>
            <p className="mt-2 text-sm text-zinc-500">Verifique o link ou entre em contato com o restaurante.</p>
            <Button asChild className="mt-5 bg-brand-red hover:bg-brand-red/90">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </div>
        )}

        {order && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'Pedido'}
                  </p>
                  <p className="text-2xl font-bold text-zinc-950">#{order.orderNumber}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.orderStatus] ?? 'bg-zinc-100 text-zinc-700'}`}>
                  {STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
                </span>
              </div>
              <p className="text-sm text-zinc-600">Cliente: <span className="font-medium text-zinc-900">{order.customerName}</span></p>
              {order.deliveryType === 'DELIVERY' && order.customerAddress && (
                <p className="mt-1 text-sm text-zinc-500">
                  Entrega: {order.customerAddress.street}, {order.customerAddress.number} — {order.customerAddress.neighborhood}
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900">Itens do pedido</h2>
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">
                      <span className="font-medium">{item.quantity}x</span> {item.productNameSnapshot}
                    </span>
                    <span className="font-medium text-zinc-900">{fmt(item.itemTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-3 text-sm text-zinc-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{fmt(order.subtotal)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="mt-1 flex justify-between">
                    <span>Entrega</span>
                    <span>{fmt(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between text-base font-bold text-zinc-950">
                  <span>Total</span>
                  <span>{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            <Button className="w-full bg-brand-red hover:bg-brand-red/90" onClick={() => router.push(`/pedido/${orderId}/acompanhar`)}>
              Acompanhar pedido
            </Button>
            {order.paymentStatus === 'PENDING' && (
              <Button variant="outline" className="w-full" onClick={() => router.push(`/pedido/${orderId}/pagamento`)}>
                Pagar com PIX
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
