'use client'

import { cn } from '@/lib/utils'
import type { ActiveMarketplacesMap } from '@/hooks/useActiveMarketplaces'

export type OriginKey =
  | 'WEBSITE'
  | 'WHATSAPP_BOT'
  | 'MESA'
  | 'MANUAL'
  | 'IFOOD'
  | 'NINETYNINEFOOD'
  | 'KEETA'

type OriginDef = {
  key: OriginKey
  label: string
  conditional?: keyof ActiveMarketplacesMap
}

const ORIGIN_SEQUENCE: OriginDef[] = [
  { key: 'WEBSITE', label: 'Site' },
  { key: 'WHATSAPP_BOT', label: 'WhatsApp' },
  { key: 'MESA', label: 'Mesa' },
  { key: 'MANUAL', label: 'Balcão' },
  { key: 'IFOOD', label: 'iFood', conditional: 'IFOOD' },
  { key: 'NINETYNINEFOOD', label: '99', conditional: 'NINETYNINEFOOD' },
  { key: 'KEETA', label: 'Keeta', conditional: 'KEETA' },
]

type Props = {
  counts: Record<string, number>
  selected: OriginKey | null
  onChange: (origin: OriginKey | null) => void
  activeMarketplaces: ActiveMarketplacesMap
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors',
        'min-w-[56px] hover:border-zinc-300 hover:bg-zinc-50',
        active
          ? 'border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700'
          : 'border-zinc-200 bg-white text-zinc-700',
      )}
    >
      {children}
    </button>
  )
}

export function OriginFilter({ counts, selected, onChange, activeMarketplaces }: Props) {
  const total = counts._all ?? Object.values(counts).reduce((s, v) => s + v, 0)

  const visibleOrigins = ORIGIN_SEQUENCE.filter(
    (o) => !o.conditional || activeMarketplaces[o.conditional],
  )

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-2">
        {/* Todos */}
        <PillButton active={selected === null} onClick={() => onChange(null)}>
          <span className="text-lg font-bold leading-none">{total}</span>
          <span className="mt-0.5 text-[11px] font-medium">Todos</span>
        </PillButton>

        {visibleOrigins.map((o) => (
          <PillButton
            key={o.key}
            active={selected === o.key}
            onClick={() => onChange(selected === o.key ? null : o.key)}
          >
            <span className="text-lg font-bold leading-none">{counts[o.key] ?? 0}</span>
            <span className="mt-0.5 text-[11px] font-medium">{o.label}</span>
          </PillButton>
        ))}
      </div>
    </div>
  )
}
