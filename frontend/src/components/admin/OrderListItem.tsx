'use client'

import { OrderOriginBadge } from './OrderOriginBadge'
import { StatusBadge } from './StatusBadge'
import {
  DELIVERY_LABEL,
  Order,
  PAYMENT_LABEL,
  formatCurrency,
  formatOrderTime,
} from '@/lib/order-types'
import { cn } from '@/lib/utils'

type Props = {
  order: Order
  selected?: boolean
  highlighted?: boolean
  onClick: () => void
}

export function OrderListItem({ order, selected, highlighted, onClick }: Props) {
  const itemsLabel = order.items
    .slice(0, 2)
    .map((item) => `${item.quantity}x ${item.productNameSnapshot}`)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-brand-red/40 hover:bg-brand-red-soft/40',
        selected && 'border-brand-red bg-brand-red-soft/60',
        highlighted && 'ring-2 ring-brand-yellow',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-950">
              #{String(order.orderNumber).padStart(3, '0')}
            </span>
            <OrderOriginBadge origin={order.origin} compact />
            <StatusBadge status={order.orderStatus} />
          </div>
          <p className="mt-2 truncate text-sm font-medium text-zinc-900">
            {order.customerName}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">{itemsLabel || 'Sem itens'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-zinc-950">{formatCurrency(order.total)}</p>
          <p className="mt-1 text-xs text-zinc-500">{formatOrderTime(order.createdAt)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>{DELIVERY_LABEL[order.deliveryType]}</span>
        <span className="text-zinc-300">•</span>
        <span>{PAYMENT_LABEL[order.paymentMethod]}</span>
        {order.externalOrderId && (
          <>
            <span className="text-zinc-300">•</span>
            <span>{order.externalOrderId}</span>
          </>
        )}
      </div>
    </button>
  )
}
