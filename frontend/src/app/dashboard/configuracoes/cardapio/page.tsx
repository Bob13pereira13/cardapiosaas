'use client'

import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { API_URL, APP_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type CardapioConfig = {
  corPrimaria: string
  banner: string
  logo: string
  textoBoasVindas: string
  textoRodape: string
  mostrarPrecos: boolean
  aberto: boolean
  slug: string
}

export default function CardapioConfigPage() {
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<CardapioConfig>({
    corPrimaria: '#e11d48',
    banner: '',
    logo: '',
    textoBoasVindas: '',
    textoRodape: '',
    mostrarPrecos: true,
    aberto: true,
    slug: '',
  })
  const [uploading, setUploading] = useState<'banner' | 'logo' | null>(null)
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
          corPrimaria: (data.corPrimaria as string) ?? '#e11d48',
          banner: (data.banner as string) ?? '',
          logo: (data.logo as string) ?? '',
          textoBoasVindas: (data.textoBoasVindas as string) ?? '',
          textoRodape: (data.textoRodape as string) ?? '',
          mostrarPrecos: (data.mostrarPrecos as boolean) ?? true,
          aberto: (data.aberto as boolean) ?? true,
          slug: (data.slug as string) ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function uploadFile(file: File, field: 'banner' | 'logo') {
    const token = getToken()
    if (!token) return
    setUploading(field)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!res.ok) { toast.error('Erro ao enviar arquivo.'); return }
      const data = await res.json() as { url: string }
      setConfig((prev) => ({ ...prev, [field]: data.url }))
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          corPrimaria: config.corPrimaria,
          banner: config.banner || null,
          logo: config.logo || null,
          textoBoasVindas: config.textoBoasVindas || null,
          textoRodape: config.textoRodape || null,
          mostrarPrecos: config.mostrarPrecos,
          aberto: config.aberto,
        }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao salvar.'); return }
      toast.success('Aparência do cardápio salva!')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
  }

  const toggleRow = (key: 'mostrarPrecos' | 'aberto', label: string, description: string) => (
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
  )

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, 'logo') }} />
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, 'banner') }} />

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold text-zinc-900">Identidade visual</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cor primária</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.corPrimaria}
                    onChange={(e) => setConfig((prev) => ({ ...prev, corPrimaria: e.target.value }))}
                    className="h-10 w-16 cursor-pointer rounded-md border border-input p-1"
                  />
                  <Input
                    value={config.corPrimaria}
                    onChange={(e) => setConfig((prev) => ({ ...prev, corPrimaria: e.target.value }))}
                    className="font-mono"
                    maxLength={7}
                    placeholder="#e11d48"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {config.logo ? (
                    <img src={config.logo} alt="logo" className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-zinc-100" />
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'}>
                    {uploading === 'logo' ? 'Enviando...' : 'Trocar logo'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Banner</Label>
                {config.banner && (
                  <img src={config.banner} alt="banner" className="mb-3 h-24 w-full rounded-lg object-cover" />
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => bannerRef.current?.click()} disabled={uploading === 'banner'}>
                  {uploading === 'banner' ? 'Enviando...' : config.banner ? 'Trocar banner' : 'Enviar banner'}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold text-zinc-900">Textos do cardápio</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Mensagem de boas-vindas</Label>
                <Input
                  value={config.textoBoasVindas}
                  onChange={(e) => setConfig((prev) => ({ ...prev, textoBoasVindas: e.target.value }))}
                  placeholder="Ex: Bem-vindo ao nosso cardápio!"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mensagem de rodapé</Label>
                <Textarea
                  rows={3}
                  value={config.textoRodape}
                  onChange={(e) => setConfig((prev) => ({ ...prev, textoRodape: e.target.value }))}
                  placeholder="Ex: Obrigado pela preferência!"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold text-zinc-900">Comportamento</h2>
            <div className="space-y-3">
              {toggleRow('mostrarPrecos', 'Mostrar preços', 'Exibir os preços dos produtos no cardápio')}
              {toggleRow('aberto', 'Aceitar pedidos', 'Clientes podem fazer pedidos quando ativo')}
              {!config.aberto && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Clientes não poderão fazer pedidos
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Preview</p>
            <div className="overflow-hidden rounded-lg border">
              <div className="h-12" style={{ backgroundColor: config.corPrimaria }} />
              <div className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  {config.logo ? (
                    <img src={config.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: config.corPrimaria }} />
                  )}
                  <span className="text-xs font-bold text-zinc-900">Seu restaurante</span>
                </div>
                {config.textoBoasVindas && (
                  <p className="text-xs text-zinc-500">{config.textoBoasVindas}</p>
                )}
                <div className="mt-3 rounded bg-zinc-100 px-3 py-2 text-xs font-medium" style={{ color: config.corPrimaria }}>
                  Produto exemplo — R$ 25,00
                </div>
              </div>
            </div>
          </div>

          {config.slug && (
            <a
              href={`${APP_URL}/cardapio/${config.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Ver cardápio público ↗
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave} className="bg-brand-red hover:bg-brand-red/90">
          {saving ? 'Salvando...' : 'Salvar aparência'}
        </Button>
      </div>
    </div>
  )
}
