'use client'

import { ORIGIN_META, OrderOrigin } from '@/lib/order-origin'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  origin?: OrderOrigin | null
  compact?: boolean
}

export function OrderOriginBadge({ origin = 'WEBSITE', compact = false }: Props) {
  const meta = ORIGIN_META[origin || 'WEBSITE'] ?? ORIGIN_META.WEBSITE
  const Icon = meta.icon

  return (
    <Badge
      variant="outline"
      title={meta.active ? meta.description : 'Em breve'}
      className={cn(
        'gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        meta.className,
        !meta.active && 'opacity-50',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {compact ? meta.shortLabel : meta.label}
    </Badge>
  )
}
