'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { CategoriaItem } from './CategoriaItem'
import type { CategoryDto } from '@/lib/category-types'

interface Props {
  categorias: CategoryDto[]
  loading: boolean
  onCreateCategory: () => void
  onEditCategory: (cat: CategoryDto) => void
  onDeleteCategory: (cat: CategoryDto) => void
  className?: string
}

export function CategoriaSidebar({
  categorias,
  loading,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  className,
}: Props) {
  return (
    <aside className={className ?? 'hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white lg:block'}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Categorias</h2>
          <button
            onClick={onCreateCategory}
            className="rounded-md bg-brand-red px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-red/90"
            aria-label="Nova categoria"
          >
            + Nova
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        )}

        {!loading && categorias.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-500">
            Nenhuma categoria. Crie a primeira.
          </p>
        )}

        {!loading && categorias.length > 0 && (
          <div className="space-y-0.5">
            {categorias.map((cat) => (
              <CategoriaItem
                key={cat.id}
                categoria={cat}
                onEdit={onEditCategory}
                onDelete={onDeleteCategory}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
