'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { HeatmapResponse } from '../hooks/useTrendsApi'

type HeatmapPeriod = 'last_7d' | 'last_30d' | 'last_90d'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getCellColor(orders: number, maxOrders: number): string {
  if (orders === 0 || maxOrders === 0) return '#f3f4f6'
  const intensity = orders / maxOrders
  const alpha = Math.max(0.15, intensity)
  return `rgba(220, 38, 38, ${alpha})`
}

const PERIOD_LABELS: Record<HeatmapPeriod, string> = {
  last_7d: '7 dias',
  last_30d: '30 dias',
  last_90d: '90 dias',
}

type TooltipState = {
  dayName: string
  hour: number
  orders: number
  revenue: number
  x: number
  y: number
} | null

type Props = {
  data: HeatmapResponse | null
  loading: boolean
  error: string | null
  period: HeatmapPeriod
  onPeriodChange: (p: HeatmapPeriod) => void
}

export function HeatmapChart({ data, loading, error, period, onPeriodChange }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  const matrix = data?.matrix ?? []
  const maxOrders =
    matrix.length > 0
      ? Math.max(0, ...matrix.flatMap((d) => d.hours.map((h) => h.orders)))
      : 0

  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  const CELL_W = 34
  const CELL_H = 30

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-zinc-900">
            Mapa de Calor — Pedidos por Hora
          </CardTitle>
          <Tabs
            value={period}
            onValueChange={(v) => onPeriodChange(v as HeatmapPeriod)}
          >
            <TabsList className="h-8">
              {(Object.keys(PERIOD_LABELS) as HeatmapPeriod[]).map((p) => (
                <TabsTrigger key={p} value={p} className="px-3 text-xs">
                  {PERIOD_LABELS[p]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Erro ao carregar dados.
          </p>
        )}

        {loading && (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-1">
                <div className="h-7 w-10 rounded bg-zinc-200" />
                {HOURS.map((h) => (
                  <div key={h} className="h-7 w-8 rounded bg-zinc-100" />
                ))}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="relative overflow-x-auto">
            {/* Floating tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none fixed z-50 rounded-md border bg-white px-3 py-2 text-xs shadow-lg"
                style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
              >
                <p className="font-semibold text-zinc-800">
                  {tooltip.dayName} às {tooltip.hour}h
                </p>
                <p className="text-zinc-600">{tooltip.orders} pedidos</p>
                <p className="text-zinc-600">{formatCurrency(tooltip.revenue)}</p>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `44px repeat(24, ${CELL_W}px)`,
                gap: '3px',
              }}
            >
              {/* Header row */}
              <div />
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="text-center text-[10px] text-zinc-400"
                  style={{ width: CELL_W }}
                >
                  {h}h
                </div>
              ))}

              {/* Data rows */}
              {matrix.map((day) => (
                <>
                  {/* Day label */}
                  <div
                    key={`label-${day.dayOfWeek}`}
                    className="flex items-center pr-1 text-right text-[11px] font-medium text-zinc-500"
                    style={{ height: CELL_H }}
                  >
                    {day.dayName.slice(0, 3)}
                  </div>

                  {/* Hour cells */}
                  {day.hours.map((cell) => (
                    <div
                      key={`${day.dayOfWeek}-${cell.hour}`}
                      className="cursor-default rounded-sm transition-opacity hover:opacity-80"
                      style={{
                        width: CELL_W,
                        height: CELL_H,
                        backgroundColor: getCellColor(cell.orders, maxOrders),
                      }}
                      onMouseEnter={(e) =>
                        setTooltip({
                          dayName: day.dayName,
                          hour: cell.hour,
                          orders: cell.orders,
                          revenue: cell.revenue,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseMove={(e) =>
                        setTooltip((t) =>
                          t ? { ...t, x: e.clientX, y: e.clientY } : t,
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {cell.orders > 0 && (
                        <span className="flex h-full items-center justify-center text-[9px] font-semibold text-white/80 select-none">
                          {cell.orders}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              ))}
            </div>

            {/* Color scale legend */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-zinc-400">Menos</span>
              <div className="flex gap-0.5">
                {[0.05, 0.2, 0.4, 0.6, 0.8, 1].map((a) => (
                  <div
                    key={a}
                    className="h-2.5 w-5 rounded-sm"
                    style={{
                      backgroundColor:
                        a === 0.05 ? '#f3f4f6' : `rgba(220, 38, 38, ${a})`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-zinc-400">Mais</span>
            </div>
          </div>
        )}

        {/* Peak info */}
        {!loading && !error && (
          <p className="mt-4 text-sm text-zinc-600">
            {data?.peak ? (
              <>
                <strong>Pico:</strong>{' '}
                {data.matrix[data.peak.dayOfWeek]?.dayName ?? ''} às{' '}
                {data.peak.hour}h ({data.peak.orders} pedidos)
              </>
            ) : (
              <span className="text-zinc-400">Sem dados suficientes no período.</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
