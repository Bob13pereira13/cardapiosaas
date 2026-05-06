'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Upload } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function adminToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token') ?? localStorage.getItem('adminToken') ?? localStorage.getItem('token')
}

export default function AdminConfiguracoesPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [form, setForm] = useState({
    nomePlataforma: 'cardapio.pede.ai',
    logo: '',
    urlPublica: 'https://cardapiopedeai.com.br',
    emailSuporte: 'suporte@cardapiopedeai.com.br',
    whatsappSuporte: '+5511999999999',
    asaasApiKey: '',
    asaasBaseUrl: 'https://api-sandbox.asaas.com/v3',
    asaasWebhookToken: '',
  })

  useEffect(() => {
    async function load() {
      const token = adminToken()
      if (!token) return
      const res = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setForm((current) => ({
        ...current,
        nomePlataforma: data.nomePlataforma ?? current.nomePlataforma,
        logo: data.logo ?? current.logo,
        urlPublica: data.urlPublica ?? current.urlPublica,
        emailSuporte: data.emailSuporte ?? current.emailSuporte,
        whatsappSuporte: data.whatsappSuporte ?? current.whatsappSuporte,
      }))
    }
    void load()
  }, [])

  async function uploadLogo(file: File) {
    const token = adminToken()
    if (!token) return
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body })
    if (!res.ok) {
      toast.error('Erro ao enviar logo.')
      return
    }
    const data = await res.json() as { url: string }
    setForm((current) => ({ ...current, logo: data.url }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = adminToken()
    if (!token) {
      toast.error('Sessão admin expirada.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nomePlataforma: form.nomePlataforma,
          logo: form.logo,
          urlPublica: form.urlPublica,
          emailSuporte: form.emailSuporte,
          whatsappSuporte: form.whatsappSuporte,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string }
        toast.error(data.message ?? 'Erro ao salvar configurações.')
        return
      }
      toast.success('Configurações salvas')
    } finally {
      setSaving(false)
    }
  }

  async function testAsaas() {
    const token = adminToken()
    if (!token) return
    setTesting(true)
    try {
      const res = await fetch(`${API_URL}/admin/test-asaas`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        toast.error('Não foi possível conectar ao Asaas.')
        return
      }
      toast.success('Conexão com Asaas funcionando.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Configurações admin</h1>
            <p className="text-sm text-zinc-500">Parâmetros internos da plataforma.</p>
          </div>
          <Button asChild variant="outline"><Link href="/admin/dashboard">Dashboard</Link></Button>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">Plataforma</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nome da plataforma"><Input value={form.nomePlataforma} onChange={(event) => setForm({ ...form, nomePlataforma: event.target.value })} /></Field>
              <Field label="URL pública"><Input value={form.urlPublica} onChange={(event) => setForm({ ...form, urlPublica: event.target.value })} /></Field>
              <Field label="E-mail de suporte"><Input value={form.emailSuporte} onChange={(event) => setForm({ ...form, emailSuporte: event.target.value })} /></Field>
              <Field label="WhatsApp de suporte"><Input value={form.whatsappSuporte} onChange={(event) => setForm({ ...form, whatsappSuporte: event.target.value })} /></Field>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file) }} />
            <div className="mt-5 flex items-center gap-4">
              {form.logo ? <img src={form.logo} alt="Logo" className="h-16 w-16 rounded-lg object-cover" /> : <div className="h-16 w-16 rounded-lg bg-zinc-100" />}
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Enviar logo
              </Button>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-zinc-950">Asaas global</h2>
              <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setShowSecrets((value) => !value)}>
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecrets ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="ASAAS API Key"><Input type={showSecrets ? 'text' : 'password'} value={form.asaasApiKey} onChange={(event) => setForm({ ...form, asaasApiKey: event.target.value })} /></Field>
              <Field label="ASAAS Base URL"><Input value={form.asaasBaseUrl} onChange={(event) => setForm({ ...form, asaasBaseUrl: event.target.value })} /></Field>
              <Field label="ASAAS Webhook Token"><Input type={showSecrets ? 'text' : 'password'} value={form.asaasWebhookToken} onChange={(event) => setForm({ ...form, asaasWebhookToken: event.target.value })} /></Field>
            </div>
            <Button type="button" variant="outline" className="mt-5" disabled={testing} onClick={() => void testAsaas()}>
              {testing ? 'Testando...' : 'Testar conexão'}
            </Button>
          </section>

          <div className="flex justify-end">
            <Button disabled={saving} className="bg-zinc-950 text-white hover:bg-zinc-800">{saving ? 'Salvando...' : 'Salvar configurações'}</Button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
