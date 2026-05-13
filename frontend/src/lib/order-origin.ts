import {
  Bot,
  Building2,
  Globe2,
  LucideIcon,
  ShoppingBag,
  Store,
  Utensils,
} from 'lucide-react'

export type OrderOrigin =
  | 'WEBSITE'
  | 'MANUAL'
  | 'WHATSAPP_BOT'
  | 'MESA'
  | 'IFOOD'
  | 'NINETYNINEFOOD'
  | 'KEETA'
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
    label: 'Balcão',
    shortLabel: 'Balcão',
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
  MESA: {
    label: 'Mesa',
    shortLabel: 'Mesa',
    description: 'Pedido via QR code de mesa',
    active: true,
    icon: Utensils,
    className: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  IFOOD: {
    label: 'iFood',
    shortLabel: 'iFood',
    description: 'Integração iFood',
    active: false,
    icon: ShoppingBag,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  },
  NINETYNINEFOOD: {
    label: '99Food',
    shortLabel: '99',
    description: 'Integração 99Food',
    active: false,
    icon: ShoppingBag,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  },
  KEETA: {
    label: 'Keeta',
    shortLabel: 'Keeta',
    description: 'Integração Keeta',
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

const DISPLAYED_ORIGINS: OrderOrigin[] = [
  'WEBSITE',
  'MANUAL',
  'WHATSAPP_BOT',
  'MESA',
  'IFOOD',
  'NINETYNINEFOOD',
  'KEETA',
]

export function getActiveOrigins(): OrderOrigin[] {
  return DISPLAYED_ORIGINS.filter((origin) => ORIGIN_META[origin].active)
}

export function getAllOrigins(): OrderOrigin[] {
  return DISPLAYED_ORIGINS
}

export function formatOriginLabel(origin?: OrderOrigin | null) {
  return origin ? ORIGIN_META[origin]?.label ?? origin : 'Site'
}
