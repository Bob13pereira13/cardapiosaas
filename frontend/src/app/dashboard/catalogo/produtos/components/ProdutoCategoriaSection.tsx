'use client'

import { Pencil } from 'lucide-react'
import { ProdutoCard } from './ProdutoCard'
import type { CategoryDto } from '@/lib/category-types'
import type { ProductDto } from '@/lib/product-types'

interface Props {
  categoria: CategoryDto | null
  produtos: ProductDto[]
  onEditCategoria?: (cat: CategoryDto) => void
  onEditProduct: (id: number) => void
  onDeleteProduct: (produto: ProductDto) => void
  onToggleDisponivel: (id: number, next: boolean) => void
  onDuplicateProduct: (id: number) => void
}

export function ProdutoCategoriaSection({
  categoria,
  produtos,
  onEditCategoria,
  onEditProduct,
  onDeleteProduct,
  onToggleDisponivel,
  onDuplicateProduct,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          {categoria ? categoria.nome : 'Sem categoria'}
          <span className="ml-2 text-xs font-normal text-gray-500">({produtos.length})</span>
        </h2>

        {categoria && onEditCategoria && (
          <button
            onClick={() => onEditCategoria(categoria)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
          >
            <Pencil className="h-3 w-3" />
            Editar categoria
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {produtos.map((p) => (
          <ProdutoCard
            key={p.id}
            produto={p}
            onEdit={onEditProduct}
            onDelete={onDeleteProduct}
            onToggleDisponivel={onToggleDisponivel}
            onDuplicate={onDuplicateProduct}
          />
        ))}
      </div>
    </section>
  )
}
