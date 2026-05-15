'use client'

import { useState } from 'react'
import { AlignLeft } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CategoriaSidebar } from './CategoriaSidebar'
import type { CategoryDto } from '@/lib/category-types'

interface Props {
  categorias: CategoryDto[]
  loading: boolean
  onCreateCategory: () => void
  onEditCategory: (cat: CategoryDto) => void
  onDeleteCategory: (cat: CategoryDto) => void
}

export function CategoriaMobileDrawer({
  categorias,
  loading,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <AlignLeft className="h-4 w-4" />
          Categorias
          {categorias.length > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {categorias.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Categorias</SheetTitle>
        </SheetHeader>
        <CategoriaSidebar
          categorias={categorias}
          loading={loading}
          className="block w-full flex-shrink-0 bg-white"
          onCreateCategory={() => { setOpen(false); onCreateCategory() }}
          onEditCategory={(cat) => { setOpen(false); onEditCategory(cat) }}
          onDeleteCategory={(cat) => { setOpen(false); onDeleteCategory(cat) }}
        />
      </SheetContent>
    </Sheet>
  )
}
