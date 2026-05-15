'use client'

import { Layers } from 'lucide-react'

interface Props {
  onCreateFirst: () => void
}

export function ComplementosEmpty({ onCreateFirst }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
      <Layers className="h-12 w-12 text-gray-300" />
      <h3 className="mt-4 text-sm font-semibold text-gray-900">Nenhum complemento cadastrado</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Complementos agrupam opções (ex: tamanhos, adicionais, sabores) que você pode reusar em vários produtos.
      </p>
      <button
        onClick={onCreateFirst}
        className="mt-4 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
      >
        Criar primeiro complemento
      </button>
    </div>
  )
}
