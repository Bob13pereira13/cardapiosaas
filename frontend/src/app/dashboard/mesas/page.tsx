'use client'

import { useCallback, useEffect, useState } from 'react'
import { Minus, Plus, QrCode, Trash2, X } from 'lucide-react'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type ComandaItem = { id: number; productId: number; quantidade: number; preco: number; obs?: string; product: { nome: string } }
type Comanda = { id: number; status: string; total: number; items: ComandaItem[] }
type Table = { id: number; numero: number; nome?: string; capacidade?: number; ativa: boolean; comandas: Comanda[] }

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

export default function MesasPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newTableDialog, setNewTableDialog] = useState(false)
  const [newTableNum, setNewTableNum] = useState('')
  const [newTableName, setNewTableName] = useState('')
  const [addItemProductId, setAddItemProductId] = useState('')
  const [addItemQty, setAddItemQty] = useState('1')
  const [products, setProducts] = useState<{ id: number; nome: string; preco: number }[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/tables')
      if (data) setTables(data)
    } catch { toast.error('Erro ao carregar mesas') } finally { setLoading(false) }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiFetch('/products')
      if (data) setProducts(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { load(); loadProducts() }, [load, loadProducts])

  const openSheet = useCallback(async (table: Table) => {
    try {
      const comanda = await apiFetch(`/tables/${table.id}/comanda`)
      const updated = { ...table, comandas: comanda ? [comanda] : [] }
      setSelectedTable(updated)
      setSheetOpen(true)
    } catch { setSelectedTable(table); setSheetOpen(true) }
  }, [])

  const createTable = async () => {
    if (!newTableNum) return
    setSaving(true)
    try {
      await apiFetch('/tables', { method: 'POST', body: JSON.stringify({ numero: Number(newTableNum), nome: newTableName || undefined }) })
      toast.success('Mesa criada')
      setNewTableDialog(false); setNewTableNum(''); setNewTableName('')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const openComanda = async (tableId: number) => {
    try {
      const comanda = await apiFetch(`/tables/${tableId}/comanda`, { method: 'POST' })
      toast.success('Comanda aberta')
      if (selectedTable && comanda) {
        setSelectedTable({ ...selectedTable, comandas: [comanda] })
      }
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const addItem = async () => {
    if (!selectedTable || !addItemProductId) return
    setSaving(true)
    try {
      await apiFetch(`/tables/${selectedTable.id}/comanda/items`, {
        method: 'POST',
        body: JSON.stringify({ productId: Number(addItemProductId), quantidade: Number(addItemQty) }),
      })
      toast.success('Item adicionado')
      setAddItemProductId(''); setAddItemQty('1')
      const comanda = await apiFetch(`/tables/${selectedTable.id}/comanda`)
      if (selectedTable && comanda) setSelectedTable({ ...selectedTable, comandas: [comanda] })
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const removeItem = async (itemId: number) => {
    if (!selectedTable) return
    try {
      await apiFetch(`/tables/${selectedTable.id}/comanda/items/${itemId}`, { method: 'DELETE' })
      toast.success('Item removido')
      const comanda = await apiFetch(`/tables/${selectedTable.id}/comanda`)
      if (selectedTable) setSelectedTable({ ...selectedTable, comandas: comanda ? [comanda] : [] })
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const closeComanda = async () => {
    if (!selectedTable) return
    try {
      await apiFetch(`/tables/${selectedTable.id}/comanda/close`, { method: 'POST' })
      toast.success('Comanda fechada')
      setSelectedTable({ ...selectedTable, comandas: [] })
      setSheetOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const openQr = async (tableId: number) => {
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/tables/${tableId}/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { toast.error('Erro ao gerar QR Code'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { toast.error('Erro ao abrir QR Code') }
  }

  const deleteTable = async (tableId: number) => {
    if (!confirm('Excluir mesa?')) return
    try {
      await apiFetch(`/tables/${tableId}`, { method: 'DELETE' })
      toast.success('Mesa excluída')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const activeComanda = selectedTable?.comandas?.[0]

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors />
      <PageHeader title="Mesas" description="Gerencie mesas e comandas do salão" actions={
        <Button onClick={() => setNewTableDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />Nova Mesa
        </Button>
      } />

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : tables.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma mesa cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const open = table.comandas?.length > 0
            return (
              <Card
                key={table.id}
                className={`cursor-pointer transition-all hover:shadow-md ${open ? 'border-brand-red' : ''}`}
                onClick={() => openSheet(table)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Mesa {table.numero}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={(e) => { e.stopPropagation(); void openQr(table.id) }}>
                        <QrCode className="h-4 w-4" />
                        QR
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteTable(table.id) }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {table.nome && <p className="text-xs text-muted-foreground">{table.nome}</p>}
                </CardHeader>
                <CardContent>
                  <Badge variant={open ? 'destructive' : 'secondary'}>
                    {open ? 'Ocupada' : 'Livre'}
                  </Badge>
                  {open && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      R$ {(table.comandas[0].total ?? 0).toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sheet: comanda detail */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedTable && (
            <>
              <SheetHeader>
                <SheetTitle>Mesa {selectedTable.numero}{selectedTable.nome ? ` — ${selectedTable.nome}` : ''}</SheetTitle>
              </SheetHeader>

              {!activeComanda ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">Mesa livre. Abrir comanda?</p>
                  <Button onClick={() => openComanda(selectedTable.id)}>Abrir Comanda</Button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Itens da comanda</span>
                    <span className="font-semibold text-brand-red">R$ {(activeComanda.total ?? 0).toFixed(2)}</span>
                  </div>

                  {activeComanda.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem itens ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeComanda.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
                          <div>
                            <p>{item.product.nome}</p>
                            {item.obs && <p className="text-xs text-muted-foreground">{item.obs}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{item.quantidade}x R$ {item.preco.toFixed(2)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add item */}
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-xs">Adicionar item</Label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-background"
                        value={addItemProductId}
                        onChange={(e) => setAddItemProductId(e.target.value)}
                      >
                        <option value="">Selecionar produto</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco.toFixed(2)}</option>
                        ))}
                      </select>
                      <Input className="w-16" type="number" min={1} value={addItemQty} onChange={(e) => setAddItemQty(e.target.value)} />
                    </div>
                    <Button size="sm" disabled={!addItemProductId || saving} onClick={addItem}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <Button variant="destructive" className="w-full" onClick={closeComanda}>
                      Fechar Conta (R$ {(activeComanda.total ?? 0).toFixed(2)})
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New table dialog */}
      <Dialog open={newTableDialog} onOpenChange={setNewTableDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Mesa</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Número *</Label>
              <Input type="number" min={1} value={newTableNum} onChange={(e) => setNewTableNum(e.target.value)} placeholder="Ex: 1" />
            </div>
            <div className="space-y-1">
              <Label>Nome (opcional)</Label>
              <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Ex: Varanda" />
            </div>
            <Button className="w-full" disabled={!newTableNum || saving} onClick={createTable}>Criar Mesa</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
