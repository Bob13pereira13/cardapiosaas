'use client'

import { Clock, Phone, Printer, ReceiptText, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { printOrder } from '@/lib/print-order'
import { OrderOriginBadge } from './OrderOriginBadge'
import { StatusBadge } from './StatusBadge'
import {
  DELIVERY_LABEL,
  Order,
  PAYMENT_LABEL,
  STATUS_LABEL,
  formatCurrency,
  formatOrderTime,
  getNextStatuses,
} from '@/lib/order-types'

type Props = {
  order?: Order | null
  updating?: boolean
  onStatusChange: (status: Order['orderStatus']) => void
}

export function OrderDetailPanel({ order, updating, onStatusChange }: Props) {
  if (!order) {
    return (
      <div className="flex h-full min-h-96 items-center justify-center rounded-lg border bg-white p-8 text-center text-sm text-zinc-500">
        Selecione um pedido para ver os detalhes.
      </div>
    )
  }

  const nextStatuses = getNextStatuses(order)

  return (
    <div className="h-full rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-950">
              Pedido #{String(order.orderNumber).padStart(3, '0')}
            </h2>
            <OrderOriginBadge origin={order.origin} />
            <StatusBadge status={order.orderStatus} />
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {formatOrderTime(order.createdAt)}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-bold text-brand-red">{formatCurrency(order.total)}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2 gap-2" onClick={() => printOrder(order)}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="font-semibold text-zinc-950">{order.customerName}</p>
          <p className="mt-1 flex items-center gap-2 text-zinc-500">
            <Phone className="h-4 w-4" />
            {order.customerPhone}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="flex items-center gap-2 font-semibold text-zinc-950">
            <Truck className="h-4 w-4" />
            {DELIVERY_LABEL[order.deliveryType]}
          </p>
          <p className="mt-1 text-zinc-500">{PAYMENT_LABEL[order.paymentMethod]}</p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <ReceiptText className="h-4 w-4" />
          Itens
        </h3>
        <div className="mt-3 divide-y rounded-lg border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 p-3">
              <div>
                <p className="font-medium text-zinc-950">
                  {item.quantity}x {item.productNameSnapshot}
                </p>
                {item.itemNotes && (
                  <p className="mt-1 text-xs text-zinc-500">{item.itemNotes}</p>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold text-zinc-950">
                {formatCurrency(item.itemTotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-lg bg-zinc-50 p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Entrega</span>
          <span>{formatCurrency(order.deliveryFee)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-brand-red">
            <span>Desconto</span>
            <span>-{formatCurrency(order.discountAmount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-zinc-950">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      {order.notes && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {order.notes}
        </div>
      )}

      <div className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <Clock className="h-4 w-4" />
          Historico
        </h3>
        <div className="mt-3 space-y-2 text-sm text-zinc-500">
          {(order.history?.length ? order.history : []).map((item) => (
            <div key={item.id} className="flex justify-between gap-3">
              <span>{STATUS_LABEL[item.toStatus]}</span>
              <span>{formatOrderTime(item.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              type="button"
              disabled={updating}
              variant={status === 'CANCELED' ? 'destructive' : 'default'}
              className={status === 'CANCELED' ? '' : 'bg-brand-red hover:bg-brand-red/90'}
              onClick={() => onStatusChange(status)}
            >
              {STATUS_LABEL[status]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
