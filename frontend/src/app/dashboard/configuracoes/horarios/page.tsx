'use client'

import { useEffect, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const DAYS = [
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira' },
  { key: 'qua', label: 'Quarta-feira' },
  { key: 'qui', label: 'Quinta-feira' },
  { key: 'sex', label: 'Sexta-feira' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
] as const

type DaySchedule = { open: boolean; from: string; to: string; pauseActive?: boolean; pauseFrom?: string; pauseTo?: string }
type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
type BusinessHours = Record<WeekDay, DaySchedule>

const DEFAULT_HOURS: BusinessHours = {
  seg: { open: true, from: '08:00', to: '22:00' },
  ter: { open: true, from: '08:00', to: '22:00' },
  qua: { open: true, from: '08:00', to: '22:00' },
  qui: { open: true, from: '08:00', to: '22:00' },
  sex: { open: true, from: '08:00', to: '22:00' },
  sab: { open: true, from: '08:00', to: '22:00' },
  dom: { open: false, from: '08:00', to: '22:00' },
}

export default function HorariosPage() {
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS)
  const [mensagemFechado, setMensagemFechado] = useState('')
  const [aberto, setAberto] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (handleUnauthorized(res)) return null
        return res.json() as Promise<{ businessHours?: BusinessHours | string; mensagemFechado?: string | null; aberto?: boolean }>
      })
      .then((data) => {
        if (typeof data?.businessHours === 'string') {
          setHours(JSON.parse(data.businessHours) as BusinessHours)
        } else if (data?.businessHours) {
          setHours(data.businessHours)
        }
        setMensagemFechado(data?.mensagemFechado ?? '')
        setAberto(data?.aberto ?? true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function update(key: WeekDay, patch: Partial<DaySchedule>) {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function handleSave() {
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessHours: JSON.stringify(hours), mensagemFechado }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao salvar horários.'); return }
      toast.success('Horários salvos!')
    } finally {
      setSaving(false)
    }
  }

  async function toggleManualPause() {
    const token = getToken()
    if (!token) return
    const next = !aberto
    setAberto(next)
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ aberto: next }),
    })
    if (handleUnauthorized(res)) return
    if (!res.ok) {
      setAberto(!next)
      toast.error('Erro ao alterar status da loja.')
      return
    }
    toast.success(next ? 'Loja reaberta' : 'Loja pausada manualmente')
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />

      {!aberto && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          Loja pausada manualmente. Clientes não poderão fazer pedidos.
        </div>
      )}

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-zinc-950">Fechar loja agora temporariamente</p>
            <p className="text-sm text-zinc-500">Use quando precisar pausar pedidos fora da regra de horários.</p>
          </div>
          <button
            type="button"
            onClick={() => void toggleManualPause()}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              !aberto ? 'bg-brand-red' : 'bg-zinc-300',
            )}
          >
            <span className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform', !aberto ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="divide-y divide-zinc-100">
          {DAYS.map(({ key, label }) => {
            const day = hours[key] ?? { open: false, from: '08:00', to: '22:00' }
            return (
              <div key={key} className={cn('grid gap-4 px-5 py-4 lg:grid-cols-[auto_160px_1fr]', !day.open && 'opacity-50')}>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => update(key, { open: !day.open })}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition',
                      day.open ? 'bg-brand-red' : 'bg-zinc-200',
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', day.open ? 'translate-x-4' : 'translate-x-1')} />
                  </button>
                  <span className={cn('shrink-0 text-sm font-medium', day.open ? 'text-zinc-900' : 'text-zinc-400')}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={day.from}
                    disabled={!day.open}
                    onChange={(e) => update(key, { from: e.target.value })}
                    className="h-9 rounded-md border border-input px-2 text-sm disabled:bg-zinc-50"
                  />
                  <span className="text-zinc-400">até</span>
                  <input
                    type="time"
                    value={day.to}
                    disabled={!day.open}
                    onChange={(e) => update(key, { to: e.target.value })}
                    className="h-9 rounded-md border border-input px-2 text-sm disabled:bg-zinc-50"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <input
                      type="checkbox"
                      checked={Boolean(day.pauseActive)}
                      disabled={!day.open}
                      onChange={(e) => update(key, { pauseActive: e.target.checked, pauseFrom: day.pauseFrom ?? '12:00', pauseTo: day.pauseTo ?? '13:00' })}
                    />
                    Pausa no meio do dia
                  </label>
                  {day.pauseActive && (
                    <>
                      <input
                        type="time"
                        value={day.pauseFrom ?? '12:00'}
                        disabled={!day.open}
                        onChange={(e) => update(key, { pauseFrom: e.target.value })}
                        className="h-9 rounded-md border border-input px-2 text-sm disabled:bg-zinc-50"
                      />
                      <span className="text-zinc-400">até</span>
                      <input
                        type="time"
                        value={day.pauseTo ?? '13:00'}
                        disabled={!day.open}
                        onChange={(e) => update(key, { pauseTo: e.target.value })}
                        className="h-9 rounded-md border border-input px-2 text-sm disabled:bg-zinc-50"
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-zinc-950">Mensagem quando fechado</label>
        <Textarea className="mt-2" rows={3} value={mensagemFechado} onChange={(event) => setMensagemFechado(event.target.value)} placeholder="Ex: Estamos fechados agora. Volte a pedir amanhã a partir das 8h." />
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave} className="bg-brand-red hover:bg-brand-red/90">
          {saving ? 'Salvando...' : 'Salvar horários'}
        </Button>
      </div>
    </div>
  )
}
