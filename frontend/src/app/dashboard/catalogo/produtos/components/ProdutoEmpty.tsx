'use client'

import { Package } from 'lucide-react'

interface Props {
  onCreate: () => void
}

export function ProdutoEmpty({ onCreate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
      <Package className="mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Nenhum produto cadastrado</h3>
      <p className="mb-6 text-sm text-gray-500">
        Comece criando seu primeiro produto pra montar o cardápio.
      </p>
      <button
        onClick={onCreate}
        className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
      >
        Criar primeiro produto
      </button>
    </div>
  )
}
