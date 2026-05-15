'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { CategoryDto } from '@/lib/category-types'

interface Props {
  categoria: CategoryDto
  onEdit: (cat: CategoryDto) => void
  onDelete: (cat: CategoryDto) => void
}

export function CategoriaItem({ categoria, onEdit, onDelete }: Props) {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-gray-50">
      <span className="flex-1 truncate text-sm text-gray-900">{categoria.nome}</span>

      {categoria.productsCount !== undefined && (
        <span className="text-xs text-gray-400">{categoria.productsCount}</span>
      )}

      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(categoria) }}
          className="p-1 text-gray-400 hover:text-gray-700"
          aria-label={`Editar ${categoria.nome}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(categoria) }}
          className="p-1 text-gray-400 hover:text-red-600"
          aria-label={`Excluir ${categoria.nome}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
