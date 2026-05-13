'use client'

import { cn } from '@/lib/utils'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED'

export type StatusGroup =
  | 'PENDING'
  | 'EM_PREPARO'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED'

type StatusGroupDef = {
  key: StatusGroup
  label: string
  statuses: OrderStatus[]
}

export const STATUS_GROUPS: StatusGroupDef[] = [
  { key: 'PENDING', label: 'Pendentes', statuses: ['PENDING'] },
  {
    key: 'EM_PREPARO',
    label: 'Em preparo',
    statuses: ['CONFIRMED', 'IN_PREPARATION', 'READY'],
  },
  { key: 'OUT_FOR_DELIVERY', label: 'Saíram', statuses: ['OUT_FOR_DELIVERY'] },
  { key: 'DELIVERED', label: 'Concluídos', statuses: ['DELIVERED'] },
  { key: 'CANCELED', label: 'Cancelados', statuses: ['CANCELED'] },
]

type Props = {
  counts: Record<OrderStatus | '_all', number>
  selected: StatusGroup | null
  onChange: (group: StatusGroup | null) => void
}

export function StatusFilter({ counts, selected, onChange }: Props) {
  const total = counts._all ?? 0

  function groupCount(statuses: OrderStatus[]): number {
    return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          selected === null
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
        )}
      >
        Todos
        <span className="ml-1.5 text-xs opacity-75">({total})</span>
      </button>

      {STATUS_GROUPS.map((g) => {
        const count = groupCount(g.statuses)
        const active = selected === g.key
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onChange(active ? null : g.key)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
            )}
          >
            {g.label}
            <span className="ml-1.5 text-xs opacity-75">({count})</span>
          </button>
        )
      })}
    </div>
  )
}
