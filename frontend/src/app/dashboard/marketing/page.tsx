'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type Campaign = {
  id: number
  nome: string
  tipo: string
  status: string
  descricao?: string
  metaConversoes: number
  couponId?: number
  coupon?: { code: string; type: string; value: number }
  createdAt: string
}

type InactiveCustomer = { id: number; name: string; phone: string; lastOrderAt?: string }

async function apiFetch(path: string, options?: RequestInit) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) },
  })
  if (res.status === 401) { handleUnauthorized(res); return null }
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message ?? 'Erro') }
  if (res.status === 204) return null
  return res.json()
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ATIVA: 'default',
  RASCUNHO: 'secondary',
  PAUSADA: 'secondary',
  ENCERRADA: 'destructive',
}

const EMPTY_FORM = { nome: '', tipo: 'CUPOM', descricao: '' }

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [inactive, setInactive] = useState<InactiveCustomer[]>([])
  const [daysSince, setDaysSince] = useState('30')
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [loadingInactive, setLoadingInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<{ nome: string; tipo: string; descricao: string }>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await apiFetch('/campaigns')
      if (data) setCampaigns(data)
    } catch { toast.error('Erro ao carregar campanhas') } finally { setLoadingCampaigns(false) }
  }, [])

  const loadInactive = useCallback(async () => {
    setLoadingInactive(true)
    try {
      const data = await apiFetch(`/customers/inactive?daysSince=${daysSince}`)
      if (data) setInactive(data)
    } catch { toast.error('Erro ao carregar clientes') } finally { setLoadingInactive(false) }
  }, [daysSince])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  const createCampaign = async () => {
    if (!form.nome) { toast.error('Informe o nome da campanha'); return }
    setSaving(true)
    try {
      await apiFetch('/campaigns', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Campanha criada')
      setDialogOpen(false); setForm(EMPTY_FORM)
      loadCampaigns()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const toggleStatus = async (campaign: Campaign) => {
    try {
      const endpoint = campaign.status === 'ATIVA' ? 'pause' : 'activate'
      await apiFetch(`/campaigns/${campaign.id}/${endpoint}`, { method: 'POST' })
      toast.success(campaign.status === 'ATIVA' ? 'Pausada' : 'Ativada')
      loadCampaigns()
    } catch (e: any) { toast.error(e.message) }
  }

  const deleteCampaign = async (id: number) => {
    if (!confirm('Excluir campanha?')) return
    try {
      await apiFetch(`/campaigns/${id}`, { method: 'DELETE' })
      toast.success('Excluída')
      loadCampaigns()
    } catch (e: any) { toast.error(e.message) }
  }

  const whatsappMsg = (customer: InactiveCustomer, msg?: string) => {
    const phone = customer.phone.replace(/\D/g, '')
    const text = encodeURIComponent(msg ?? `Olá ${customer.name}, sentimos sua falta! Acesse nosso cardápio e veja as novidades.`)
    window.open(`https://wa.me/55${phone}?text=${text}`, '_blank')
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors />
      <PageHeader title="Marketing" description="Campanhas e reengajamento de clientes"/>

      <Tabs defaultValue="campanhas">
        <TabsList>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="inativos" onClick={loadInactive}>Clientes Inativos</TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas" className="mt-4 space-y-4">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Nova Campanha
          </Button>

          {loadingCampaigns ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : campaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma campanha criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{c.nome}</span>
                          <Badge variant={STATUS_BADGE[c.status] ?? 'secondary'}>{c.status}</Badge>
                          <Badge variant="outline" className="text-xs">{c.tipo}</Badge>
                        </div>
                        {c.coupon && (
                          <p className="text-sm text-muted-foreground">Cupom: {c.coupon.code}</p>
                        )}
                        {c.descricao && (
                          <p className="text-sm text-muted-foreground italic line-clamp-1">{c.descricao}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{c.metaConversoes} conversões</p>
                      </div>
                      <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => toggleStatus(c)}>
                          {c.status === 'ATIVA' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inativos" className="mt-4 space-y-4">
          <div className="flex gap-3 items-center">
            <Label className="whitespace-nowrap">Sem pedido há</Label>
            <Input type="number" className="w-24" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} />
            <Label>dias</Label>
            <Button variant="outline" onClick={loadInactive}>Buscar</Button>
          </div>

          {loadingInactive ? (
            <p className="text-muted-foreground text-sm">Buscando...</p>
          ) : inactive.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum cliente inativo nesse período.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{inactive.length} clientes encontrados</p>
              {inactive.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between bg-muted/40 rounded px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone} · Último pedido: {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('pt-BR') : 'Nunca'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => whatsappMsg(customer)}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />WhatsApp
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Campanha</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Black Friday 2026" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUPOM">Cupom</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="PUSH">Push</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição da campanha..." />
            </div>
            <Button className="w-full" disabled={saving} onClick={createCampaign}>Criar Campanha</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
