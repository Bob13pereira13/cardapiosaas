'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, ExternalLink } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_URL, APP_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type DomainConfig = {
  slug?: string | null
  customDomain?: string | null
  customDomainStatus?: string | null
  customDomainVerified?: boolean
}

export default function DominioPage() {
  const [slug, setSlug] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [saving, setSaving] = useState(false)
  const defaultUrl = `${APP_URL}/cardapio/${slug || 'seu-slug'}`

  useEffect(() => {
    async function load() {
      const token = getToken()
      if (!token) {
        window.location.href = '/login'
        return
      }
      const response = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(response)) return
      if (response.ok) {
        const data = (await response.json()) as DomainConfig
        setSlug(data.slug ?? '')
        setCustomDomain(data.customDomain ?? '')
        setStatus(data.customDomainStatus ?? null)
        setVerified(Boolean(data.customDomainVerified))
      }
    }
    void load()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customDomain: customDomain.trim().toLowerCase() }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string }
        toast.error(error.message || 'Erro ao salvar dominio.')
        return
      }
      toast.success('Dominio salvo')
      setStatus(customDomain ? 'PENDING' : null)
      setVerified(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Dominio" description="Configuracoes / Dominio" />
      <SettingsTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dominio padrao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between">
            <p className="break-all font-mono text-sm font-semibold text-zinc-950">{defaultUrl}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => void navigator.clipboard?.writeText(defaultUrl)}>
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              <Button asChild className="gap-2 bg-brand-red hover:bg-brand-red/90">
                <Link href={defaultUrl} target="_blank">
                  Abrir
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Dominio personalizado</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">Disponivel no plano Pro e Enterprise.</p>
          </div>
          <DomainBadge status={status} verified={verified} />
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label>Dominio proprio</Label>
              <Input placeholder="cardapio.pizzadojoao.com.br" value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} />
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
              <p className="font-semibold text-zinc-950">DNS</p>
              <p className="mt-2">Crie um registro CNAME apontando seu subdominio para cardapiopedeai.com.br.</p>
              <p className="mt-1 font-mono text-xs text-zinc-500">cardapio.pizzadojoao.com.br CNAME cardapiopedeai.com.br</p>
            </div>
            <div className="flex justify-end">
              <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
                {saving ? 'Salvando...' : 'Salvar dominio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function DomainBadge({ status, verified }: { status: string | null; verified: boolean }) {
  if (verified) return <Badge className="bg-emerald-600 text-white">Ativo</Badge>
  if (status === 'ERROR') return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Erro de DNS</Badge>
  if (status === 'PENDING') return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Verificando...</Badge>
  return <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-500">Nao configurado</Badge>
}
