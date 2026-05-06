'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Category = { id: number; nome: string; descricao?: string; ativa?: boolean; icone?: string }

export default function CategoriasPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editAtiva, setEditAtiva] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }
    const res = await fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } })
    if (handleUnauthorized(res)) return
    setCategories(await res.json() as Category[])
  }, [])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  function openEdit(cat: Category) {
    setEditTarget(cat)
    setEditNome(cat.nome)
    setEditDescricao(cat.descricao ?? '')
    setEditAtiva(cat.ativa ?? true)
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/categories/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: editNome.trim(), descricao: editDescricao.trim() || undefined, ativa: editAtiva }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao editar categoria.'); return }
      setCategories((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, nome: editNome.trim(), descricao: editDescricao.trim() || undefined, ativa: editAtiva } : c))
      toast.success('Categoria atualizada')
      setEditTarget(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const token = getToken()
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao excluir categoria.'); return }
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Categoria excluída')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleAtiva(cat: Category) {
    const token = getToken()
    if (!token) return
    const next = !(cat.ativa ?? true)
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, ativa: next } : c))
    const res = await fetch(`${API_URL}/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ativa: next }),
    })
    if (handleUnauthorized(res)) return
    if (!res.ok) {
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, ativa: !next } : c))
      toast.error('Erro ao atualizar categoria.')
      return
    }
    toast.success(next ? 'Categoria ativada' : 'Categoria inativada')
  }

  async function persistOrder(next: Category[]) {
    const token = getToken()
    if (!token) return
    const res = await fetch(`${API_URL}/categories/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: next.map((cat) => cat.id) }),
    })
    if (handleUnauthorized(res)) return
    if (!res.ok) toast.error('Erro ao salvar ordenação.')
  }

  function moveDragged(targetId: number) {
    if (!draggingId || draggingId === targetId) return
    const current = [...categories]
    const from = current.findIndex((cat) => cat.id === draggingId)
    const to = current.findIndex((cat) => cat.id === targetId)
    if (from < 0 || to < 0) return
    const [item] = current.splice(from, 1)
    current.splice(to, 0, item)
    setCategories(current)
    void persistOrder(current)
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Categorias"
        description="Organize os produtos do seu cardápio."
        actions={
          <Button className="bg-brand-red hover:bg-brand-red/90" onClick={() => router.push('/dashboard/categorias/nova')}>
            Nova categoria
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-100" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-white py-16 shadow-sm">
          <p className="text-sm text-zinc-500">Nenhuma categoria cadastrada.</p>
          <Button className="bg-brand-red hover:bg-brand-red/90" size="sm" onClick={() => router.push('/dashboard/categorias/nova')}>
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">Arraste para reordenar</p>
          {categories.map((cat) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => setDraggingId(cat.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveDragged(cat.id)}
              onDragEnd={() => setDraggingId(null)}
              className={cn(
                'flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm transition sm:flex-row sm:items-center',
                draggingId === cat.id && 'opacity-50',
              )}
            >
              <div className="flex flex-1 items-start gap-3">
                <span className="cursor-grab select-none pt-0.5 text-lg font-bold leading-none text-zinc-300">⋮⋮</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-zinc-900">{cat.nome}</p>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      (cat.ativa ?? true) ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500',
                    )}>
                      {(cat.ativa ?? true) ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {cat.descricao && <p className="mt-1 text-xs text-zinc-500">{cat.descricao}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => void toggleAtiva(cat)}
                  className={cn(
                    'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                    (cat.ativa ?? true) ? 'bg-brand-red' : 'bg-zinc-200',
                  )}
                  aria-label="Alternar status"
                >
                  <span className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform', (cat.ativa ?? true) ? 'translate-x-8' : 'translate-x-1')} />
                </button>
                <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>Editar</Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(cat)}>Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-zinc-50 p-3">
              <div>
                <Label>Ativa</Label>
                <p className="text-xs text-zinc-500">Categorias inativas não aparecem no cardápio.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditAtiva(!editAtiva)}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  editAtiva ? 'bg-brand-red' : 'bg-zinc-200',
                )}
              >
                <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', editAtiva ? 'translate-x-4' : 'translate-x-1')} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Os produtos vinculados à <strong>"{deleteTarget?.nome}"</strong> não serão deletados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button disabled={deleting} className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
