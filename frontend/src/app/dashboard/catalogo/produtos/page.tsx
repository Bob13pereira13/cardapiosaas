'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCategorias } from './hooks/useCategorias'
import { useProducts } from './hooks/useProducts'
import { CategoriaSidebar } from './components/CategoriaSidebar'
import { CategoriaMobileDrawer } from './components/CategoriaMobileDrawer'
import { CategoriaFormModal } from './components/CategoriaFormModal'
import { ConfirmDeleteCategoriaDialog } from './components/ConfirmDeleteCategoriaDialog'
import { ProdutoCategoriaSection } from './components/ProdutoCategoriaSection'
import { ProdutoEmpty } from './components/ProdutoEmpty'
import { ConfirmDeleteProductDialog } from './components/ConfirmDeleteProductDialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { CategoryDto } from '@/lib/category-types'
import type { ProductDto } from '@/lib/product-types'

export default function ProdutosPage() {
  const router = useRouter()

  // Categorias
  const {
    data: categorias,
    loading: catsLoading,
    refetch: refetchCats,
    remove: removeCategory,
  } = useCategorias()
  const [editingCategory, setEditingCategory] = useState<CategoryDto | 'new' | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryDto | null>(null)

  // Search com debounce
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Produtos
  const {
    data: products,
    loading: prodLoading,
    error: prodError,
    refetch: refetchProducts,
    remove: removeProduct,
    toggleDisponivel,
    duplicate,
  } = useProducts({ search })
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(null)

  // Handlers categoria
  const handleDeleteCategoryConfirm = async () => {
    if (!deletingCategory) return
    try {
      await removeCategory(deletingCategory.id)
      toast.success('Categoria removida')
      setDeletingCategory(null)
      void refetchCats()
      void refetchProducts()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao remover')
    }
  }

  // Handlers produto
  const handleCreateProduct = () => router.push('/dashboard/produtos/novo')
  const handleEditProduct = (id: number) => router.push(`/dashboard/produtos/${id}/editar`)

  const handleDeleteProductConfirm = async () => {
    if (!deletingProduct) return
    try {
      await removeProduct(deletingProduct.id)
      toast.success('Produto removido')
      setDeletingProduct(null)
      void refetchProducts()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao remover')
    }
  }

  const handleToggleDisponivel = async (id: number, next: boolean) => {
    try {
      await toggleDisponivel(id, next)
      toast.success(next ? 'Produto disponível' : 'Produto oculto')
      void refetchProducts()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao atualizar')
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await duplicate(id)
      toast.success('Produto duplicado')
      void refetchProducts()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao duplicar')
    }
  }

  // Agrupa por categoryId
  const productsByCategory = useMemo(() => {
    const map = new Map<number | null, ProductDto[]>()
    for (const p of products) {
      const key = p.categoryId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [products])

  const semCategoria = productsByCategory.get(null) ?? []

  return (
    <div className="flex gap-0">
      <CategoriaSidebar
        categorias={categorias}
        loading={catsLoading}
        onCreateCategory={() => setEditingCategory('new')}
        onEditCategory={setEditingCategory}
        onDeleteCategory={setDeletingCategory}
      />

      <main className="min-w-0 flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <CategoriaMobileDrawer
              categorias={categorias}
              loading={catsLoading}
              onCreateCategory={() => setEditingCategory('new')}
              onEditCategory={setEditingCategory}
              onDeleteCategory={setDeletingCategory}
            />
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Pesquise um produto"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
            />
          </div>

          <button
            onClick={handleCreateProduct}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo produto</span>
          </button>
        </div>

        {/* Loading */}
        {prodLoading && (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-64" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!prodLoading && prodError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Erro ao carregar produtos: {prodError}
          </div>
        )}

        {/* Empty */}
        {!prodLoading && !prodError && products.length === 0 && (
          <ProdutoEmpty onCreate={handleCreateProduct} />
        )}

        {/* Grid agrupado */}
        {!prodLoading && !prodError && products.length > 0 && (
          <div className="space-y-8">
            {categorias.map((cat) => {
              const catProducts = productsByCategory.get(cat.id) ?? []
              if (catProducts.length === 0) return null
              return (
                <ProdutoCategoriaSection
                  key={cat.id}
                  categoria={cat}
                  produtos={catProducts}
                  onEditCategoria={setEditingCategory}
                  onEditProduct={handleEditProduct}
                  onDeleteProduct={setDeletingProduct}
                  onToggleDisponivel={handleToggleDisponivel}
                  onDuplicateProduct={handleDuplicate}
                />
              )
            })}

            {semCategoria.length > 0 && (
              <ProdutoCategoriaSection
                categoria={null}
                produtos={semCategoria}
                onEditProduct={handleEditProduct}
                onDeleteProduct={setDeletingProduct}
                onToggleDisponivel={handleToggleDisponivel}
                onDuplicateProduct={handleDuplicate}
              />
            )}
          </div>
        )}
      </main>

      {/* Modais */}
      <CategoriaFormModal
        open={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        categoria={editingCategory === 'new' ? null : editingCategory}
        onSaved={() => { setEditingCategory(null); void refetchCats() }}
      />

      <ConfirmDeleteCategoriaDialog
        categoria={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategoryConfirm}
      />

      <ConfirmDeleteProductDialog
        produto={deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProductConfirm}
      />
    </div>
  )
}
