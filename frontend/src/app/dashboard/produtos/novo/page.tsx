'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { DEFAULT_PRODUCT_ORDER_TYPES, DEFAULT_PRODUCT_AVAILABLE_LINKS } from '@/lib/product-defaults'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Category = { id: number; nome: string }

export default function NovoProdutoPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [precoPromocional, setPrecoPromocional] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [disponivel, setDisponivel] = useState(true)
  const [emDestaque, setEmDestaque] = useState(false)
  const [tempoPreparo, setTempoPreparo] = useState('')
  const [sku, setSku] = useState('')
  const [estoqueAtivo, setEstoqueAtivo] = useState(false)
  const [estoque, setEstoque] = useState('0')
  const [imagem, setImagem] = useState('')
  const [disponibilidadeAtiva, setDisponibilidadeAtiva] = useState(false)
  const [disponibilidadeInicio, setDisponibilidadeInicio] = useState('')
  const [disponibilidadeFim, setDisponibilidadeFim] = useState('')
  const [disponibilidadeDias, setDisponibilidadeDias] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const token = getToken()
    if (!token) { window.location.href = '/login'; setLoading(false); return }
    fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (handleUnauthorized(r)) return []
        return r.json() as Promise<Category[]>
      })
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(file: File) {
    const token = getToken()
    if (!token) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!res.ok) { toast.error('Erro ao enviar imagem.'); return }
      const data = await res.json() as { url: string }
      setImagem(data.url)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          preco: Number(preco),
          precoPromocional: precoPromocional ? Number(precoPromocional) : undefined,
          categoriaId: categoriaId ? Number(categoriaId) : undefined,
          categoryId: categoriaId ? Number(categoriaId) : undefined,
          disponivel,
          emDestaque,
          tempoPreparo: tempoPreparo ? Number(tempoPreparo) : undefined,
          sku: sku.trim() || undefined,
          estoqueAtivo,
          estoque: estoqueAtivo ? Number(estoque || 0) : 0,
          imageUrl: imagem || undefined,
          imagem: imagem || undefined,
          disponibilidadeAtiva,
          disponibilidadeInicio: disponibilidadeAtiva && disponibilidadeInicio ? disponibilidadeInicio : undefined,
          disponibilidadeFim: disponibilidadeAtiva && disponibilidadeFim ? disponibilidadeFim : undefined,
          disponibilidadeDias: disponibilidadeAtiva ? disponibilidadeDias : undefined,
          // FIX TEMPORÁRIO: campos required no backend (Fase 1A.4)
          // Remove na Fase 4B quando UI tiver campos explícitos
          orderTypes: DEFAULT_PRODUCT_ORDER_TYPES,
          availableLinks: DEFAULT_PRODUCT_AVAILABLE_LINKS,
        }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        toast.error(err.message ?? 'Erro inesperado')
        return
      }
      toast.success('Produto criado')
      router.push('/dashboard/produtos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Novo produto" description="Produtos / Novo" />

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Preço promocional (opcional)</Label>
              <Input type="number" step="0.01" min="0" value={precoPromocional} onChange={(e) => setPrecoPromocional(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Produto em destaque</Label>
              <div className="flex h-10 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEmDestaque(!emDestaque)}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    emDestaque ? 'bg-brand-red' : 'bg-zinc-200',
                  )}
                >
                  <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', emDestaque ? 'translate-x-4' : 'translate-x-1')} />
                </button>
                <span className="text-sm text-zinc-600">{emDestaque ? 'Destacado' : 'Normal'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Disponível</Label>
              <div className="flex h-10 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDisponivel(!disponivel)}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    disponivel ? 'bg-brand-red' : 'bg-zinc-200',
                  )}
                >
                  <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', disponivel ? 'translate-x-4' : 'translate-x-1')} />
                </button>
                <span className="text-sm text-zinc-600">{disponivel ? 'Disponível' : 'Indisponível'}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tempo de preparo em minutos</Label>
              <Input type="number" min="0" placeholder="Ex: 25" value={tempoPreparo} onChange={(e) => setTempoPreparo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SKU/Código interno</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="rounded-lg border bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Controle de estoque</Label>
                <p className="text-xs text-zinc-500">Acompanhe a quantidade disponível para este produto.</p>
              </div>
              <button
                type="button"
                onClick={() => setEstoqueAtivo(!estoqueAtivo)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                  estoqueAtivo ? 'bg-brand-red' : 'bg-zinc-200',
                )}
              >
                <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', estoqueAtivo ? 'translate-x-4' : 'translate-x-1')} />
              </button>
            </div>
            {estoqueAtivo && (
              <div className="mt-4 max-w-xs space-y-1.5">
                <Label>Quantidade em estoque</Label>
                <Input type="number" min="0" value={estoque} onChange={(e) => setEstoque(e.target.value)} />
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-zinc-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Disponibilidade por horário</Label>
                <p className="text-xs text-zinc-500">Defina quando este produto fica disponível automaticamente.</p>
              </div>
              <button
                type="button"
                onClick={() => setDisponibilidadeAtiva(!disponibilidadeAtiva)}
                className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', disponibilidadeAtiva ? 'bg-brand-red' : 'bg-zinc-200')}
              >
                <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', disponibilidadeAtiva ? 'translate-x-4' : 'translate-x-1')} />
              </button>
            </div>
            {disponibilidadeAtiva && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Hora início</Label>
                    <Input type="time" value={disponibilidadeInicio} onChange={(e) => setDisponibilidadeInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hora fim</Label>
                    <Input type="time" value={disponibilidadeFim} onChange={(e) => setDisponibilidadeFim(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dias da semana</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDisponibilidadeDias((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                        className={cn('rounded px-2.5 py-1 text-xs font-medium transition-colors', disponibilidadeDias.includes(i) ? 'bg-brand-red text-white' : 'bg-white border text-zinc-600')}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Imagem</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }} />
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {uploading ? 'Enviando...' : 'Selecionar imagem'}
              </Button>
              {imagem && <img src={imagem} alt="preview" className="h-16 w-16 rounded-lg object-cover" />}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving || loading} className="bg-brand-red hover:bg-brand-red/90">
              {saving ? 'Salvando...' : 'Criar produto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
