import { Badge } from '@/components/ui/badge'
import { OrderStatus, STATUS_LABEL } from '@/lib/order-types'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  CONFIRMED: 'border-blue-200 bg-blue-50 text-blue-700',
  IN_PREPARATION: 'border-purple-200 bg-purple-50 text-purple-700',
  READY: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  OUT_FOR_DELIVERY: 'border-sky-200 bg-sky-50 text-sky-700',
  DELIVERED: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  CANCELED: 'border-red-200 bg-red-50 text-red-700',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-full px-2.5 py-1 text-xs', STATUS_CLASS[status])}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}
