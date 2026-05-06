'use client'

import { useEffect, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type DeliveryConfig = {
  aceitaEntrega: boolean
  aceitaRetirada: boolean
  aceitaMesa: boolean
  taxaEntrega: number
  pedidoMinimoEntregaGratis: number | null
  raioEntregaKm: number | null
  tempoEstimadoEntrega: string
  mensagemEntrega: string
  bairrosAtendidos: string[]
}

export default function EntregaPage() {
  const [config, setConfig] = useState<DeliveryConfig>({
    aceitaEntrega: true,
    aceitaRetirada: true,
    aceitaMesa: false,
    taxaEntrega: 0,
    pedidoMinimoEntregaGratis: null,
    raioEntregaKm: null,
    tempoEstimadoEntrega: '30 min',
    mensagemEntrega: '',
    bairrosAtendidos: [],
  })
  const [bairro, setBairro] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (handleUnauthorized(res)) return null
        return res.json() as Promise<Record<string, unknown>>
      })
      .then((data) => {
        if (!data) return
        setConfig({
          aceitaEntrega: (data.aceitaEntrega as boolean) ?? true,
          aceitaRetirada: (data.aceitaRetirada as boolean) ?? true,
          aceitaMesa: (data.aceitaMesa as boolean) ?? false,
          taxaEntrega: (data.taxaEntrega as number) ?? 0,
          pedidoMinimoEntregaGratis: (data.pedidoMinimoEntregaGratis as number | null) ?? null,
          raioEntregaKm: (data.raioEntregaKm as number | null) ?? null,
          tempoEstimadoEntrega: (data.tempoEstimadoEntrega as string) ?? '30 min',
          mensagemEntrega: (data.mensagemEntrega as string) ?? '',
          bairrosAtendidos: Array.isArray(data.bairrosAtendidos) ? data.bairrosAtendidos as string[] : [],
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          aceitaEntrega: config.aceitaEntrega,
          aceitaRetirada: config.aceitaRetirada,
          aceitaMesa: config.aceitaMesa,
          taxaEntrega: config.taxaEntrega,
          pedidoMinimoEntregaGratis: config.pedidoMinimoEntregaGratis,
          raioEntregaKm: config.raioEntregaKm,
          tempoEstimadoEntrega: config.tempoEstimadoEntrega || null,
          mensagemEntrega: config.mensagemEntrega || null,
          bairrosAtendidos: config.bairrosAtendidos,
        }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao salvar.'); return }
      toast.success('Configurações de entrega salvas!')
    } finally {
      setSaving(false)
    }
  }

  function addBairro() {
    const value = bairro.trim()
    if (!value) return
    setConfig((prev) => ({ ...prev, bairrosAtendidos: [...new Set([...prev.bairrosAtendidos, value])] }))
    setBairro('')
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
  }

  const modalidades: Array<{ key: keyof DeliveryConfig; label: string; description: string }> = [
    { key: 'aceitaEntrega', label: 'Entrega em domicílio', description: 'Clientes podem solicitar entrega no endereço' },
    { key: 'aceitaRetirada', label: 'Retirada no local', description: 'Clientes retiram o pedido no restaurante' },
    { key: 'aceitaMesa', label: 'Consumo no local (mesa)', description: 'Clientes fazem pedidos pela mesa' },
  ]

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold text-zinc-900">Modalidades</h2>
        <div className="space-y-3">
          {modalidades.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-zinc-900">{label}</p>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition', config[key] ? 'bg-brand-red' : 'bg-zinc-200')}
              >
                <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', config[key] ? 'translate-x-4' : 'translate-x-1')} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold text-zinc-900">Mensagem e bairros atendidos</h2>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Mensagem sobre entrega</Label>
            <Textarea
              rows={3}
              value={config.mensagemEntrega}
              onChange={(e) => setConfig((prev) => ({ ...prev, mensagemEntrega: e.target.value }))}
              placeholder="Ex: Entregamos apenas até 3km do centro."
            />
          </div>
          <div className="space-y-2">
            <Label>Bairros atendidos</Label>
            <div className="flex gap-2">
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Nome do bairro" />
              <Button type="button" variant="outline" onClick={addBairro}>Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.bairrosAtendidos.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, bairrosAtendidos: prev.bairrosAtendidos.filter((bairroItem) => bairroItem !== item) }))}
                  className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold text-brand-red"
                >
                  {item} ×
                </button>
              ))}
              {config.bairrosAtendidos.length === 0 && <p className="text-xs text-zinc-500">Nenhum bairro cadastrado.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold text-zinc-900">Taxas e prazos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Taxa de entrega (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={config.taxaEntrega}
              onChange={(e) => setConfig((prev) => ({ ...prev, taxaEntrega: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Entrega grátis acima de (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={config.pedidoMinimoEntregaGratis ?? ''}
              placeholder="Desativado"
              onChange={(e) => setConfig((prev) => ({ ...prev, pedidoMinimoEntregaGratis: e.target.value ? parseFloat(e.target.value) : null }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Raio máximo de entrega (km)</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={config.raioEntregaKm ?? ''}
              placeholder="Sem limite"
              onChange={(e) => setConfig((prev) => ({ ...prev, raioEntregaKm: e.target.value ? parseFloat(e.target.value) : null }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tempo estimado</Label>
            <select
              value={config.tempoEstimadoEntrega}
              onChange={(e) => setConfig((prev) => ({ ...prev, tempoEstimadoEntrega: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="30 min">30 min</option>
              <option value="45 min">45 min</option>
              <option value="60 min">60 min</option>
              <option value="90 min">90 min</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave} className="bg-brand-red hover:bg-brand-red/90">
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  )
}
