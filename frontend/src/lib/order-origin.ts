import {
  Bot,
  Building2,
  Globe2,
  LucideIcon,
  ShoppingBag,
  Store,
} from 'lucide-react'

export type OrderOrigin =
  | 'WEBSITE'
  | 'MANUAL'
  | 'WHATSAPP_BOT'
  | 'IFOOD'
  | 'RAPPI_99'
  | 'UBER_EATS'
  | 'OTHER'

type OriginMeta = {
  label: string
  shortLabel: string
  description: string
  active: boolean
  icon: LucideIcon
  className: string
}

export const ORIGIN_META: Record<OrderOrigin, OriginMeta> = {
  WEBSITE: {
    label: 'Site',
    shortLabel: 'Site',
    description: 'Cardapio publico proprio',
    active: true,
    icon: Globe2,
    className: 'border-red-200 bg-brand-red-soft text-brand-red',
  },
  MANUAL: {
    label: 'Balcao',
    shortLabel: 'Balcao',
    description: 'Pedido lancado no painel',
    active: true,
    icon: Store,
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  WHATSAPP_BOT: {
    label: 'WhatsApp',
    shortLabel: 'WhatsApp',
    description: 'Pedido recebido pelo bot',
    active: true,
    icon: Bot,
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  IFOOD: {
    label: 'iFood',
    shortLabel: 'iFood',
    description: 'Integracao em breve',
    active: false,
    icon: ShoppingBag,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  },
  RAPPI_99: {
    label: '99/Rappi',
    shortLabel: '99/Rappi',
    description: 'Integracao em breve',
    active: false,
    icon: ShoppingBag,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  },
  UBER_EATS: {
    label: 'Uber Eats',
    shortLabel: 'Uber Eats',
    description: 'Integracao em breve',
    active: false,
    icon: ShoppingBag,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  },
  OTHER: {
    label: 'Outro',
    shortLabel: 'Outro',
    description: 'Canal externo',
    active: false,
    icon: Building2,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  },
}

export function getActiveOrigins() {
  return getAllOrigins().filter((origin) => ORIGIN_META[origin].active)
}

export function getAllOrigins() {
  return Object.keys(ORIGIN_META) as OrderOrigin[]
}

export function formatOriginLabel(origin?: OrderOrigin | null) {
  return origin ? ORIGIN_META[origin]?.label ?? origin : 'Site'
}
