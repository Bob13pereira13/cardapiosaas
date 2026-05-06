'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Category = { id: number; nome: string }
type Product = {
  id: number
  nome: string
  descricao?: string
  preco: number
  precoPromocional?: number | null
  disponivel: boolean
  emDestaque?: boolean
  tempoPreparo?: number | null
  sku?: string | null
  estoqueAtivo?: boolean
  estoque?: number
  categoria?: { id: number; nome: string }
  category?: { id: number; nome: string }
  categoryId?: number
  imageUrl?: string
  imagem?: string
}

export default function EditarProdutoPage() {
  const { id } = useParams<{ id: string }>()
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
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }

    Promise.all([
      fetch(`${API_URL}/products?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (handleUnauthorized(r)) return { data: [] }
        return r.json() as Promise<{ data?: Product[] }>
      }),
      fetch(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (handleUnauthorized(r)) return []
        return r.json() as Promise<Category[]>
      }),
    ])
      .then(([products, cats]) => {
        const product = (products.data ?? []).find((p) => p.id === Number(id))
        if (!product) {
          toast.error('Produto não encontrado')
          router.push('/dashboard/produtos')
          return
        }
        setNome(product.nome)
        setDescricao(product.descricao ?? '')
        setPreco(String(product.preco))
        setPrecoPromocional(product.precoPromocional ? String(product.precoPromocional) : '')
        setCategoriaId(product.categoria?.id ? String(product.categoria.id) : product.category?.id ? String(product.category.id) : product.categoryId ? String(product.categoryId) : '')
        setDisponivel(product.disponivel)
        setEmDestaque(Boolean(product.emDestaque))
        setTempoPreparo(product.tempoPreparo ? String(product.tempoPreparo) : '')
        setSku(product.sku ?? '')
        setEstoqueAtivo(Boolean(product.estoqueAtivo))
        setEstoque(String(product.estoque ?? 0))
        setImagem(product.imageUrl ?? product.imagem ?? '')
        if ((product as any).disponibilidadeAtiva) setDisponibilidadeAtiva(true)
        if ((product as any).disponibilidadeInicio) setDisponibilidadeInicio((product as any).disponibilidadeInicio)
        if ((product as any).disponibilidadeFim) setDisponibilidadeFim((product as any).disponibilidadeFim)
        if ((product as any).disponibilidadeDias?.length) setDisponibilidadeDias((product as any).disponibilidadeDias)
        setCategories(cats)
      })
      .catch(() => toast.error('Erro ao carregar produto.'))
      .finally(() => setLoading(false))
  }, [id, router])

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
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          preco: Number(preco),
          precoPromocional: precoPromocional ? Number(precoPromocional) : null,
          categoriaId: categoriaId ? Number(categoriaId) : null,
          categoryId: categoriaId ? Number(categoriaId) : null,
          disponivel,
          emDestaque,
          tempoPreparo: tempoPreparo ? Number(tempoPreparo) : null,
          sku: sku.trim() || null,
          estoqueAtivo,
          estoque: estoqueAtivo ? Number(estoque || 0) : 0,
          imageUrl: imagem || null,
          imagem: imagem || null,
          disponibilidadeAtiva,
          disponibilidadeInicio: disponibilidadeAtiva && disponibilidadeInicio ? disponibilidadeInicio : null,
          disponibilidadeFim: disponibilidadeAtiva && disponibilidadeFim ? disponibilidadeFim : null,
          disponibilidadeDias: disponibilidadeAtiva ? disponibilidadeDias : [0, 1, 2, 3, 4, 5, 6],
        }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        toast.error(err.message ?? 'Erro inesperado')
        return
      }
      toast.success('Produto atualizado')
      router.push('/dashboard/produtos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-56 animate-pulse rounded bg-zinc-100" />
        <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Editar produto"
        description="Produtos / Editar"
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/produtos">Cancelar</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do produto</CardTitle>
        </CardHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
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
            <Label>Imagem atual</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }} />
            <div className="flex flex-col gap-4 rounded-lg border bg-zinc-50 p-4 sm:flex-row sm:items-center">
              {imagem ? (
                <img src={imagem} alt="Preview do produto" className="h-24 w-24 rounded-lg object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white text-xs text-zinc-400">
                  Sem imagem
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                {uploading ? 'Enviando...' : 'Trocar imagem'}
              </Button>
            </div>
          </div>
          </CardContent>

          <CardFooter className="justify-end gap-2 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
