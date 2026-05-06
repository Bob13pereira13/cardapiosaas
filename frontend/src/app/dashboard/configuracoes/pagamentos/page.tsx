'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type PaymentConfig = {
  aceitaDinheiro: boolean
  aceitaPixPresencial: boolean
  chavePix: string
  aceitaCartaoCredito: boolean
  aceitaCartaoDebito: boolean
  asaasConfigured: boolean
}

export default function PagamentosPage() {
  const router = useRouter()
  const [config, setConfig] = useState<PaymentConfig>({
    aceitaDinheiro: true,
    aceitaPixPresencial: true,
    chavePix: '',
    aceitaCartaoCredito: false,
    aceitaCartaoDebito: false,
    asaasConfigured: false,
  })
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
          aceitaDinheiro: (data.aceitaDinheiro as boolean) ?? true,
          aceitaPixPresencial: (data.aceitaPixPresencial as boolean) ?? true,
          chavePix: (data.chavePix as string) ?? '',
          aceitaCartaoCredito: (data.aceitaCartaoCredito as boolean) ?? false,
          aceitaCartaoDebito: (data.aceitaCartaoDebito as boolean) ?? false,
          asaasConfigured: Boolean(data.asaasConfigured ?? data.asaasCustomerId),
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
      const { asaasConfigured: _, ...payload } = config
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...payload,
          chavePix: payload.chavePix.trim() || null,
        }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao salvar.'); return }
      toast.success('Configurações de pagamento salvas!')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
  }

  const presenciais: Array<{ key: keyof PaymentConfig; label: string; description: string }> = [
    { key: 'aceitaDinheiro', label: 'Dinheiro', description: 'Pagamento em dinheiro na entrega ou balcão' },
    { key: 'aceitaCartaoCredito', label: 'Cartão de crédito', description: 'Maquininha física na entrega' },
    { key: 'aceitaCartaoDebito', label: 'Cartão de débito', description: 'Maquininha física na entrega' },
  ]

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold text-zinc-900">Pagamento presencial</h2>
        <div className="space-y-3">
          {presenciais.map(({ key, label, description }) => (
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">PIX presencial</p>
            <p className="text-xs text-zinc-500">Cliente realiza o PIX na hora da entrega</p>
          </div>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, aceitaPixPresencial: !prev.aceitaPixPresencial }))}
            className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition', config.aceitaPixPresencial ? 'bg-brand-red' : 'bg-zinc-200')}
          >
            <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', config.aceitaPixPresencial ? 'translate-x-4' : 'translate-x-1')} />
          </button>
        </div>
        {config.aceitaPixPresencial && (
          <div className="mt-4 space-y-1.5">
            <Label>Chave PIX</Label>
            <Input
              value={config.chavePix}
              onChange={(e) => setConfig((prev) => ({ ...prev, chavePix: e.target.value }))}
              placeholder="CPF, CNPJ, e-mail ou telefone"
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">PIX online (Asaas)</h2>
        <p className="mb-4 text-xs text-zinc-500">Receba PIX online com confirmação automática diretamente no cardápio.</p>
        {config.asaasConfigured ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Ativo</span>
            <span className="text-sm font-medium text-emerald-700">PIX online configurado no Asaas</span>
          </div>
        ) : (
          <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="font-medium text-zinc-900">PIX online não configurado</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs">
              <li>Crie conta no Asaas</li>
              <li>Copie sua API Key</li>
              <li>Acesse o suporte para configurar</li>
            </ol>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => router.push('/suporte')}>
              Falar com suporte
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave} className="bg-brand-red hover:bg-brand-red/90">
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  )
}
