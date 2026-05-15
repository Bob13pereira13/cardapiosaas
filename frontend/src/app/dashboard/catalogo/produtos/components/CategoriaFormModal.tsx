'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCategorias } from '../hooks/useCategorias'
import type { CategoryDto } from '@/lib/category-types'

interface Props {
  open: boolean
  onClose: () => void
  categoria: CategoryDto | null
  onSaved: () => void
}

const EMPTY = { nome: '', icone: '', ativa: true }

export function CategoriaFormModal({ open, onClose, categoria, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const { create, update } = useCategorias()

  useEffect(() => {
    if (!open) return
    if (categoria) {
      setForm({ nome: categoria.nome, icone: categoria.icone ?? '', ativa: categoria.ativa })
    } else {
      setForm(EMPTY)
    }
  }, [open, categoria])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        ativa: form.ativa,
        ...(form.icone.trim() && { icone: form.icone.trim() }),
      }
      if (categoria) {
        await update(categoria.id, payload)
        toast.success('Categoria atualizada')
      } else {
        await create(payload)
        toast.success('Categoria criada')
      }
      onSaved()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{categoria ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-nome">Nome *</Label>
            <Input
              id="cat-nome"
              autoFocus
              required
              maxLength={100}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Entradas"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-icone">Ícone (opcional)</Label>
            <Input
              id="cat-icone"
              maxLength={50}
              value={form.icone}
              onChange={(e) => setForm((f) => ({ ...f, icone: e.target.value }))}
              placeholder="🍕 ou nome do ícone"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="cat-ativa"
              checked={form.ativa}
              onCheckedChange={(v) => setForm((f) => ({ ...f, ativa: v }))}
            />
            <Label htmlFor="cat-ativa">Categoria ativa</Label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !form.nome.trim()}
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90 disabled:opacity-50"
            >
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
