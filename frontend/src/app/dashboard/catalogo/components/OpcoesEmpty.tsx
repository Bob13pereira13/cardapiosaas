import { Package } from 'lucide-react'

interface Props {
  onCreateFirst: () => void
}

export function OpcoesEmpty({ onCreateFirst }: Props) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12">
      <Package className="h-12 w-12 text-gray-300" />
      <p className="mt-3 text-base font-medium text-gray-900">Nenhuma opção cadastrada</p>
      <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
        Opções são unidades reutilizáveis usadas em complementos. Crie uma vez e use em vários
        produtos.
      </p>
      <button
        onClick={onCreateFirst}
        className="mt-4 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
      >
        Criar primeira opção
      </button>
    </div>
  )
}
