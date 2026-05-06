'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'

type ComboItemProd = { id: number; comboId: number; productId: number; quantidade: number; product: { nome: string; preco: number } }
type Combo = { id: number; nome: string; descricao?: string; preco: number; ativo: boolean; imagem?: string; items: ComboItemProd[] }
type Product = { id: number; nome: string; preco: number }

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

const EMPTY_FORM = { nome: '', descricao: '', preco: '', ativo: true }

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Combo | null>(null)
  const [form, setForm] = useState<{ nome: string; descricao: string; preco: string; ativo: boolean }>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [addProductId, setAddProductId] = useState('')
  const [addProductQty, setAddProductQty] = useState('1')
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null)
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/combos')
      if (data) setCombos(data)
    } catch { toast.error('Erro ao carregar combos') } finally { setLoading(false) }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiFetch('/products?limit=200')
      if (data) setProducts(data.data ?? data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { load(); loadProducts() }, [load, loadProducts])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (combo: Combo) => {
    setEditing(combo)
    setForm({ nome: combo.nome, descricao: combo.descricao ?? '', preco: String(combo.preco), ativo: combo.ativo })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.nome || !form.preco) { toast.error('Nome e preço são obrigatórios'); return }
    setSaving(true)
    try {
      const body = { nome: form.nome, descricao: form.descricao || undefined, preco: Number(form.preco), ativo: form.ativo }
      if (editing) {
        await apiFetch(`/combos/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        toast.success('Combo atualizado')
      } else {
        await apiFetch('/combos', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Combo criado')
      }
      setDialogOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Excluir combo?')) return
    try {
      await apiFetch(`/combos/${id}`, { method: 'DELETE' })
      toast.success('Excluído')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const openItems = async (combo: Combo) => {
    const fresh = await apiFetch(`/combos/${combo.id}`)
    setSelectedCombo(fresh ?? combo)
    setAddProductId(''); setAddProductQty('1')
    setItemsDialogOpen(true)
  }

  const addItem = async () => {
    if (!selectedCombo || !addProductId) return
    try {
      await apiFetch(`/combos/${selectedCombo.id}/items`, {
        method: 'POST',
        body: JSON.stringify({ productId: Number(addProductId), quantidade: Number(addProductQty) }),
      })
      toast.success('Item adicionado')
      const fresh = await apiFetch(`/combos/${selectedCombo.id}`)
      if (fresh) setSelectedCombo(fresh)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const removeItem = async (itemId: number) => {
    if (!selectedCombo) return
    try {
      await apiFetch(`/combos/${selectedCombo.id}/items/${itemId}`, { method: 'DELETE' })
      toast.success('Item removido')
      const fresh = await apiFetch(`/combos/${selectedCombo.id}`)
      if (fresh) setSelectedCombo(fresh)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors />
      <PageHeader title="Combos" description="Crie combos de produtos com preço especial" actions={
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Combo</Button>
      } />

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : combos.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum combo criado ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => (
            <Card key={combo.id} className={!combo.ativo ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{combo.nome}</CardTitle>
                    {combo.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{combo.descricao}</p>}
                  </div>
                  <Badge variant={combo.ativo ? 'default' : 'secondary'} className="shrink-0">
                    {combo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-lg font-bold text-brand-red">R$ {combo.preco.toFixed(2)}</p>

                {combo.items.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {combo.items.map((i) => (
                      <p key={i.id}>{i.quantidade}x {i.product.nome}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openItems(combo)}>
                    Itens ({combo.items.length})
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(combo)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(combo.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Combo' : 'Novo Combo'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Combo Família" />
            </div>
            <div className="space-y-1">
              <Label>Preço (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, ativo: !form.ativo })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.ativo ? 'bg-brand-red' : 'bg-zinc-200'}`}
              >
                <span className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.ativo ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <Label>{form.ativo ? 'Ativo no cardápio' : 'Inativo'}</Label>
            </div>
            <Button className="w-full" disabled={saving} onClick={save}>
              {editing ? 'Salvar' : 'Criar Combo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items management dialog */}
      <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Itens — {selectedCombo?.nome}</DialogTitle></DialogHeader>
          {selectedCombo && (
            <div className="space-y-4 mt-2">
              {selectedCombo.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item no combo.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCombo.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 text-sm">
                      <span>{item.quantidade}x {item.product.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">R$ {item.product.preco.toFixed(2)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <Label className="text-xs">Adicionar produto</Label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-background"
                    value={addProductId}
                    onChange={(e) => setAddProductId(e.target.value)}
                  >
                    <option value="">Selecionar produto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco.toFixed(2)}</option>
                    ))}
                  </select>
                  <Input className="w-16" type="number" min={1} value={addProductQty} onChange={(e) => setAddProductQty(e.target.value)} />
                </div>
                <Button size="sm" disabled={!addProductId} onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
