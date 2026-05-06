'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Agendamento = {
  id: number
  dataHora: string
  tipo: string
  status: string
  descricao?: string
  obs?: string
  total?: number
  customer?: { name: string; phone: string }
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDENTE: 'secondary',
  CONFIRMADO: 'default',
  CANCELADO: 'destructive',
  CONCLUIDO: 'secondary',
}

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

function formatDt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const EMPTY_FORM = { dataHora: '', tipo: 'RESERVA', status: 'PENDENTE', descricao: '', obs: '' }

export default function AgendaPage() {
  const [items, setItems] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Agendamento | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = filterDate ? `?dataHoraFrom=${filterDate}&dataHoraTo=${filterDate}T23:59:59` : ''
      const data = await apiFetch(`/agenda${params}`)
      if (data) setItems(data)
    } catch { toast.error('Erro ao carregar agenda') } finally { setLoading(false) }
  }, [filterDate])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: Agendamento) => {
    setEditing(item)
    setForm({
      dataHora: item.dataHora.slice(0, 16),
      tipo: item.tipo,
      status: item.status,
      descricao: item.descricao ?? '',
      obs: item.obs ?? '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.dataHora) { toast.error('Informe a data e hora'); return }
    setSaving(true)
    try {
      if (editing) {
        await apiFetch(`/agenda/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) })
        toast.success('Atualizado')
      } else {
        await apiFetch('/agenda', { method: 'POST', body: JSON.stringify(form) })
        toast.success('Agendamento criado')
      }
      setDialogOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Excluir agendamento?')) return
    try {
      await apiFetch(`/agenda/${id}`, { method: 'DELETE' })
      toast.success('Excluído')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const changeStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/agenda/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors />
      <PageHeader title="Agenda" description="Reservas e agendamentos" actions={
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo</Button>
      } />

      <div className="flex gap-3 items-center">
        <Input type="date" className="w-48" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {filterDate && <Button variant="outline" size="sm" onClick={() => setFilterDate('')}>Limpar filtro</Button>}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatDt(item.dataHora)}</span>
                      <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'}>{item.status}</Badge>
                      <Badge variant="outline" className="text-xs">{item.tipo}</Badge>
                    </div>
                    {item.descricao && <p className="text-sm">{item.descricao}</p>}
                    {item.customer && (
                      <p className="text-sm text-muted-foreground">{item.customer.name} · {item.customer.phone}</p>
                    )}
                    {item.obs && <p className="text-xs text-muted-foreground italic">{item.obs}</p>}
                    {item.total != null && <p className="text-sm font-medium">R$ {item.total.toFixed(2)}</p>}
                  </div>
                  <div className="flex gap-1 items-center flex-wrap">
                    {item.status === 'PENDENTE' && (
                      <Button size="sm" variant="outline" onClick={() => changeStatus(item.id, 'CONFIRMADO')}>Confirmar</Button>
                    )}
                    {(item.status === 'CONFIRMADO' || item.status === 'PENDENTE') && (
                      <Button size="sm" variant="outline" onClick={() => changeStatus(item.id, 'CANCELADO')}>Cancelar</Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" value={form.dataHora} onChange={(e) => setForm({ ...form, dataHora: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESERVA">Reserva</SelectItem>
                    <SelectItem value="PEDIDO">Pedido</SelectItem>
                    <SelectItem value="ENCOMENDA">Encomenda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing && (
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDENTE">Pendente</SelectItem>
                      <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Mesa para 4 pessoas" />
            </div>
            <div className="space-y-1">
              <Label>Obs</Label>
              <Textarea rows={2} value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
            </div>
            <Button className="w-full" disabled={saving} onClick={save}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
