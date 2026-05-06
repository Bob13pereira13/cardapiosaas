'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type TrackingConfig = {
  gtmId?: string | null
  ga4MeasurementId?: string | null
  metaPixelId?: string | null
}

export default function TrackingPage() {
  const [gtmId, setGtmId] = useState('')
  const [ga4MeasurementId, setGa4MeasurementId] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaAccessToken, setMetaAccessToken] = useState('')
  const [saving, setSaving] = useState(false)

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
        const data = (await response.json()) as TrackingConfig
        setGtmId(data.gtmId ?? '')
        setGa4MeasurementId(data.ga4MeasurementId ?? '')
        setMetaPixelId(data.metaPixelId ?? '')
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
        body: JSON.stringify({
          gtmId: gtmId.trim(),
          ga4MeasurementId: ga4MeasurementId.trim(),
          metaPixelId: metaPixelId.trim(),
          metaAccessToken: metaAccessToken.trim() || undefined,
        }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string }
        toast.error(error.message || 'Erro ao salvar tracking.')
        return
      }
      toast.success('Configuracoes de tracking salvas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Tracking" description="Configuracoes / Tracking" />
      <SettingsTabs />

      <form onSubmit={submit} className="space-y-4">
        <TrackingSection
          title="Google Tag Manager"
          docs="https://support.google.com/tagmanager"
          active={Boolean(gtmId)}
        >
          <Label>GTM ID</Label>
          <Input placeholder="GTM-XXXXXXX" value={gtmId} onChange={(event) => setGtmId(event.target.value.toUpperCase())} />
        </TrackingSection>

        <TrackingSection
          title="Google Analytics 4"
          docs="https://support.google.com/analytics"
          active={Boolean(ga4MeasurementId)}
        >
          <Label>Measurement ID</Label>
          <Input placeholder="G-XXXXXXXXXX" value={ga4MeasurementId} onChange={(event) => setGa4MeasurementId(event.target.value.toUpperCase())} />
        </TrackingSection>

        <TrackingSection title="Meta Pixel" docs="https://business.facebook.com/events_manager" active={Boolean(metaPixelId)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pixel ID</Label>
              <Input value={metaPixelId} onChange={(event) => setMetaPixelId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input type="password" value={metaAccessToken} onChange={(event) => setMetaAccessToken(event.target.value)} placeholder="Preencha para atualizar" />
            </div>
          </div>
        </TrackingSection>

        <div className="flex justify-end">
          <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
            {saving ? 'Salvando...' : 'Salvar configuracoes de tracking'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function TrackingSection({ title, docs, active, children }: { title: string; docs: string; active: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <a href={docs} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-red">
            Documentacao
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Badge variant="outline" className={active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}>
          {active ? 'Ativo' : 'Nao configurado'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  )
}
