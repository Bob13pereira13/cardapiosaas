'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Copy, Package, Search, Star } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Product = {
  id: number
  nome: string
  descricao?: string
  preco: number
  disponivel: boolean
  categoria?: { id: number; nome: string }
  imageUrl?: string
  category?: { id: number; nome: string }
  imagem?: string
  precoPromocional?: number | null
  emDestaque?: boolean
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProdutosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL')
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }
    const res = await fetch(`${API_URL}/products?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(res)) return
    const data = await res.json() as { data?: Product[] }
    setProducts(data.data ?? [])
  }, [])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const filtered = products.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase())
    const matchesAvailability =
      availability === 'ALL' ||
      (availability === 'AVAILABLE' && p.disponivel) ||
      (availability === 'UNAVAILABLE' && !p.disponivel)
    return matchesSearch && matchesAvailability
  })

  async function toggleDisponivel(product: Product) {
    const token = getToken()
    if (!token) return
    const next = !product.disponivel
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, disponivel: next } : p))
    setTogglingIds((prev) => new Set(prev).add(product.id))
    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ disponivel: next }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, disponivel: !next } : p))
        toast.error('Erro ao atualizar disponibilidade.')
      }
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(product.id); return s })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const token = getToken()
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao excluir produto.'); return }
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success('Produto excluído')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  async function duplicateProduct(product: Product) {
    const token = getToken()
    if (!token) return
    setDuplicatingId(product.id)
    try {
      const res = await fetch(`${API_URL}/products/${product.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string }
        toast.error(data.message ?? 'Erro inesperado')
        return
      }
      toast.success('Produto duplicado')
      await load()
    } finally {
      setDuplicatingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Produtos"
        description="Gerencie os itens do seu cardápio."
        actions={
          <Button className="bg-brand-red hover:bg-brand-red/90" onClick={() => router.push('/dashboard/produtos/novo')}>
            Novo produto
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['ALL', 'Todos'],
            ['AVAILABLE', 'Disponíveis'],
            ['UNAVAILABLE', 'Indisponíveis'],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={availability === value ? 'default' : 'outline'}
              className={availability === value ? 'bg-brand-red hover:bg-brand-red/90' : ''}
              onClick={() => setAvailability(value as typeof availability)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-white py-16 shadow-sm">
          <Package className="h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-500">
            {search ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
          </p>
          {!search && (
            <Button className="bg-brand-red hover:bg-brand-red/90" size="sm" onClick={() => router.push('/dashboard/produtos/novo')}>
              Criar primeiro produto
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Categoria</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Destaque</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-center">Disponível</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl || product.imagem ? (
                        <Image src={product.imageUrl ?? product.imagem ?? ''} width={40} height={40} alt={product.nome} className="h-10 w-10 rounded-lg object-cover" unoptimized />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                          <Package className="h-4 w-4 text-zinc-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-zinc-900">{product.nome}</p>
                        {product.precoPromocional ? (
                          <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Promo
                          </span>
                        ) : null}
                        {product.descricao && (
                          <p className="max-w-xs truncate text-xs text-zinc-400">{product.descricao}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                    {product.categoria?.nome ?? product.category?.nome ?? 'Sem categoria'}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {product.emDestaque ? <Star className="mx-auto h-4 w-4 fill-brand-yellow text-brand-yellow" /> : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {product.precoPromocional ? (
                      <div>
                        <p>{fmt(product.precoPromocional)}</p>
                        <p className="text-xs font-normal text-zinc-400 line-through">{fmt(product.preco)}</p>
                      </div>
                    ) : (
                      fmt(product.preco)
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={togglingIds.has(product.id)}
                      onClick={() => void toggleDisponivel(product)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        product.disponivel ? 'bg-brand-red' : 'bg-zinc-200',
                        togglingIds.has(product.id) && 'opacity-50',
                      )}
                    >
                      <span className={cn(
                        'h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                        product.disponivel ? 'translate-x-4' : 'translate-x-1',
                      )} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/produtos/${product.id}/editar`)}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/produtos/${product.id}/adicionais`)}>
                        Adicionais
                      </Button>
                      <Button variant="outline" size="sm" disabled={duplicatingId === product.id} onClick={() => void duplicateProduct(product)}>
                        <Copy className="h-3.5 w-3.5" />
                        {duplicatingId === product.id ? '...' : 'Duplicar'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(product)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O produto <strong>"{deleteTarget?.nome}"</strong> será removido permanentemente.
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
