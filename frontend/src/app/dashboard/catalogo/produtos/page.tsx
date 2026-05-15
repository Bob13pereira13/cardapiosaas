'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCategorias } from './hooks/useCategorias'
import { CategoriaSidebar } from './components/CategoriaSidebar'
import { CategoriaMobileDrawer } from './components/CategoriaMobileDrawer'
import { CategoriaFormModal } from './components/CategoriaFormModal'
import { ConfirmDeleteCategoriaDialog } from './components/ConfirmDeleteCategoriaDialog'
import type { CategoryDto } from '@/lib/category-types'

export default function ProdutosPage() {
  const { data: categorias, loading: catsLoading, refetch: refetchCats, remove: removeCategory } =
    useCategorias()

  const [editingCategory, setEditingCategory] = useState<CategoryDto | 'new' | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryDto | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return
    try {
      await removeCategory(deletingCategory.id)
      toast.success('Categoria removida')
      setDeletingCategory(null)
      void refetchCats()
    } catch (e: unknown) {
      throw e
    }
  }

  return (
    <div className="flex gap-0">
      <CategoriaSidebar
        categorias={categorias}
        loading={catsLoading}
        onCreateCategory={() => setEditingCategory('new')}
        onEditCategory={setEditingCategory}
        onDeleteCategory={setDeletingCategory}
      />

      <main className="min-w-0 flex-1 space-y-4 p-6">
        <div className="flex items-center gap-3 lg:hidden">
          <CategoriaMobileDrawer
            categorias={categorias}
            loading={catsLoading}
            onCreateCategory={() => setEditingCategory('new')}
            onEditCategory={setEditingCategory}
            onDeleteCategory={setDeletingCategory}
          />
          <h1 className="text-sm font-semibold text-gray-900">Produtos</h1>
        </div>

        {/* Placeholder Grid — chega na Fase 4B.2 */}
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">Grid de produtos em construção — Fase 4B.2</p>
        </div>
      </main>

      <CategoriaFormModal
        open={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        categoria={editingCategory === 'new' ? null : editingCategory}
        onSaved={() => { setEditingCategory(null); void refetchCats() }}
      />

      <ConfirmDeleteCategoriaDialog
        categoria={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
