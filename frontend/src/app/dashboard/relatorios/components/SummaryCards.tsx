'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SummaryCard, SummaryResponse } from '../hooks/useTrendsApi'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ChangeBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-xs ${up ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </Badge>
  )
}

type CardDef = {
  key: keyof SummaryResponse['cards']
  label: string
  format: (v: number) => string
}

const CARDS: CardDef[] = [
  { key: 'revenue', label: 'Receita', format: formatCurrency },
  { key: 'orders', label: 'Pedidos', format: (v) => String(v) },
  { key: 'averageTicket', label: 'Ticket Médio', format: formatCurrency },
  { key: 'newCustomers', label: 'Novos Clientes', format: (v) => String(v) },
]

type Props = {
  data: SummaryResponse | null
  loading: boolean
  error: string | null
}

function CardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 rounded bg-zinc-200" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-7 w-32 rounded bg-zinc-200" />
        <div className="h-4 w-20 rounded bg-zinc-200" />
      </CardContent>
    </Card>
  )
}

function SummaryCardItem({ label, card, format }: { label: string; card: SummaryCard; format: (v: number) => string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold text-zinc-900">{format(card.current)}</p>
        <div className="flex items-center gap-2">
          <ChangeBadge pct={card.changePercent} />
          <span className="text-xs text-zinc-400">vs período anterior</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SummaryCards({ data, loading, error }: Props) {
  if (error) {
    return (
      <div className="rounded-lg border border-dashed py-6 text-center text-sm text-zinc-500">
        Erro ao carregar resumo.
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <CardSkeleton key={c.key} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((c) => (
        <SummaryCardItem
          key={c.key}
          label={c.label}
          card={data.cards[c.key]}
          format={c.format}
        />
      ))}
    </div>
  )
}
