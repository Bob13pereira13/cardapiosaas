'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, CreditCard, MapPin, Phone, User } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import {
  DELIVERY_LABEL,
  Order,
  OrderStatus,
  PAYMENT_LABEL,
  STATUS_LABEL,
  formatCurrency,
  formatOrderTime,
  getNextStatuses,
} from '@/lib/order-types'

type CustomerAddress = {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  zipcode?: string
}

type OrderWithAddress = Order & {
  customerAddress?: CustomerAddress | null
}

function formatAddress(address?: CustomerAddress | null) {
  if (!address) return 'Nao informado'
  const main = [address.street, address.number].filter(Boolean).join(', ')
  const extra = [address.complement, address.neighborhood, address.city].filter(Boolean).join(' - ')
  return [main, extra, address.zipcode].filter(Boolean).join(' · ') || 'Nao informado'
}

function paymentStatusLabel(status?: string) {
  if (status === 'PAID') return 'Pago'
  if (status === 'FAILED') return 'Falhou'
  if (status === 'REFUNDED') return 'Reembolsado'
  return 'Pendente'
}

export default function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const loadOrder = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    const response = await fetch(`${API_URL}/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(response)) return
    if (response.ok) {
      setOrder((await response.json()) as OrderWithAddress)
    } else {
      setOrder(null)
    }
  }, [id, router])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadOrder()
      setLoading(false)
    }

    void init()
  }, [loadOrder])

  const nextStatuses = useMemo(() => (order ? getNextStatuses(order) : []), [order])

  async function updateStatus(status: OrderStatus) {
    if (!order) return
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setUpdating(true)
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
      if (response.ok) {
        await loadOrder()
      }
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />
  }

  if (!order) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Pedido nao encontrado"
          description="Pedidos / detalhe"
          actions={
            <Button variant="outline" className="gap-2" onClick={() => router.push('/dashboard/pedidos')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Pedido #${String(order.orderNumber).padStart(3, '0')}`}
        description={`Pedidos / #${String(order.orderNumber).padStart(3, '0')}`}
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/pedidos">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-brand-red" />
              Dados do cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <InfoItem label="Nome" value={order.customerName} />
            <InfoItem icon={Phone} label="Telefone" value={order.customerPhone} />
            <div className="md:col-span-2">
              <InfoItem icon={MapPin} label="Endereco" value={formatAddress(order.customerAddress)} />
            </div>
            <InfoItem label="Tipo" value={DELIVERY_LABEL[order.deliveryType]} />
            <InfoItem label="Criado em" value={formatOrderTime(order.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={order.orderStatus} />
              <span className="text-sm text-zinc-500">{STATUS_LABEL[order.orderStatus]}</span>
            </div>

            {nextStatuses.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    disabled={updating}
                    variant={status === 'CANCELED' ? 'destructive' : 'default'}
                    className={status === 'CANCELED' ? '' : 'bg-brand-red hover:bg-brand-red/90'}
                    onClick={() => updateStatus(status)}
                  >
                    {STATUS_LABEL[status]}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itens do pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-24 text-center">Qtd</TableHead>
                <TableHead className="w-36 text-right">Preco unit.</TableHead>
                <TableHead className="w-36 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-semibold text-zinc-950">{item.productNameSnapshot}</p>
                    {item.itemNotes && <p className="mt-1 text-xs text-zinc-500">{item.itemNotes}</p>}
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.itemTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Subtotal</TableCell>
                <TableCell className="text-right">{formatCurrency(order.subtotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>Taxa de entrega</TableCell>
                <TableCell className="text-right">{formatCurrency(order.deliveryFee)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>Desconto</TableCell>
                <TableCell className="text-right">-{formatCurrency(order.discountAmount)}</TableCell>
              </TableRow>
              <TableRow className="text-base">
                <TableCell colSpan={3} className="font-black text-zinc-950">
                  Total
                </TableCell>
                <TableCell className="text-right font-black text-zinc-950">
                  {formatCurrency(order.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-brand-red" />
              Historico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 border-l pl-4">
              {(order.history ?? []).map((item) => (
                <div key={item.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-red" />
                  <p className="font-semibold text-zinc-950">{STATUS_LABEL[item.toStatus]}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatOrderTime(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-brand-red" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <InfoItem label="Metodo" value={PAYMENT_LABEL[order.paymentMethod]} />
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">Status do pagamento</p>
              <Badge
                variant="outline"
                className="mt-2 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                {paymentStatusLabel(order.paymentStatus)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: string | number | null
  icon?: typeof Phone
}) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 font-semibold text-zinc-950">{value || '-'}</p>
    </div>
  )
}
