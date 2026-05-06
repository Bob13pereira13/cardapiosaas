'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Camera, Copy, ExternalLink, Eye, EyeOff, Lock, Store } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_URL, APP_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type UserProfile = {
  nome: string
  email: string
  whatsapp: string | null
  slug: string | null
  logo: string | null
}

export default function PerfilPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [documento, setDocumento] = useState('')
  const [enderecoLoja, setEnderecoLoja] = useState('')
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
        const data = (await response.json()) as UserProfile
        setProfile(data)
        setNome(data.nome ?? '')
        setWhatsapp(data.whatsapp ?? '')
        setLogo(data.logo ?? '')
        setDocumento(localStorage.getItem('restaurant-document') ?? '')
        setEnderecoLoja(localStorage.getItem('restaurant-address') ?? '')
      }
      setLoading(false)
    }

    void load()
  }, [])

  async function uploadLogo(file: File) {
    const token = getToken()
    if (!token) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!response.ok) {
        toast.error('Erro ao enviar logo.')
        return
      }
      const data = (await response.json()) as { url: string }
      setLogo(data.url)
    } finally {
      setUploading(false)
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim() || undefined,
          logo: logo || undefined,
        }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string }
        toast.error(error.message || 'Erro ao salvar dados.')
        return
      }
      toast.success('Dados salvos')
      localStorage.setItem('restaurant-document', documento)
      localStorage.setItem('restaurant-address', enderecoLoja)
    } finally {
      setSaving(false)
    }
  }

  async function copyMenuLink() {
    if (!profile?.slug) return
    await navigator.clipboard.writeText(`${APP_URL}/cardapio/${profile.slug}`)
    toast.success('Link copiado!')
  }

  function openMenu() {
    if (!profile?.slug) return
    window.open(`${APP_URL}/cardapio/${profile.slug}`, '_blank')
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem.')
      return
    }
    const token = getToken()
    if (!token) return
    setSavingPassword(true)
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string }
        toast.error(error.message || 'Erro ao atualizar senha.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha atualizada')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Perfil" description="Configuracoes / Perfil" />
      <SettingsTabs />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadLogo(file)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-brand-red" />
            Dados do restaurante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={saveProfile}>
            <div className="flex items-center gap-5">
              <div className="relative">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-red-soft text-3xl font-black text-brand-red">
                    {(nome || 'R').charAt(0).toUpperCase()}
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-brand-red hover:bg-brand-red/90"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Enviar logo"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <p className="font-semibold text-zinc-950">{nome || 'Restaurante'}</p>
                <p className="text-sm text-zinc-500">{profile?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Nome do restaurante" value={nome} onChange={setNome} required />
              <InputField label="Telefone/WhatsApp" value={whatsapp} onChange={setWhatsapp} />
              <InputField label="CNPJ/CPF" value={documento} onChange={setDocumento} />
              <InputField label="Endereço da loja" value={enderecoLoja} onChange={setEnderecoLoja} />
              <div className="space-y-2 md:col-span-2">
                <Label>Slug</Label>
                <div className="flex overflow-hidden rounded-md border bg-zinc-50">
                  <span className="flex items-center border-r px-3 text-sm text-zinc-400">
                    cardapiopedeai.com.br/cardapio/
                  </span>
                  <Input
                    value={profile?.slug ?? ''}
                    readOnly
                    className="border-0 bg-transparent font-mono shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => void copyMenuLink()} disabled={!profile?.slug}>
                    <Copy className="h-4 w-4" />
                    Copiar link do cardápio
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={openMenu} disabled={!profile?.slug}>
                    <ExternalLink className="h-4 w-4" />
                    Abrir cardápio público
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t pt-5">
              <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
                {saving ? 'Salvando...' : 'Salvar dados'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-brand-red" />
            Seguranca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="max-w-xl space-y-4" onSubmit={savePassword}>
            <PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} visible={showPassword} />
            <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} visible={showPassword} />
            <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} />
            <Button type="button" variant="outline" className="gap-2" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}
            </Button>
            <div className="flex justify-end border-t pt-5">
              <Button disabled={savingPassword} className="bg-brand-red hover:bg-brand-red/90">
                {savingPassword ? 'Atualizando...' : 'Atualizar senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function InputField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  )
}

function PasswordField({ label, value, onChange, visible }: { label: string; value: string; onChange: (value: string) => void; visible: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} required />
    </div>
  )
}
