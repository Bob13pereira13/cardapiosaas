'use client'

import { ImageIcon, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { LABEL_BADGES } from '@/lib/product-types'
import type { ProductDto } from '@/lib/product-types'
import { cn } from '@/lib/utils'

interface Props {
  produto: ProductDto
  onEdit: (id: number) => void
  onDelete: (produto: ProductDto) => void
  onToggleDisponivel: (id: number, next: boolean) => void
  onDuplicate: (id: number) => void
}

export function ProdutoCard({ produto, onEdit, onDelete, onToggleDisponivel, onDuplicate }: Props) {
  const isPromo =
    produto.isPromotional &&
    produto.precoPromocional !== null &&
    produto.precoPromocional < produto.preco

  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-md">
      {/* Imagem */}
      <div className="mb-3 aspect-square overflow-hidden rounded-md bg-gray-100">
        {produto.imagem ? (
          <img
            src={produto.imagem}
            alt={produto.nome}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
      </div>

      {/* Etiqueta */}
      {produto.labelType && (
        <div className="mb-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              LABEL_BADGES[produto.labelType].color,
            )}
          >
            {LABEL_BADGES[produto.labelType].label}
          </span>
        </div>
      )}

      {/* Nome + kebab */}
      <div className="flex items-start justify-between gap-1">
        <h3 className="line-clamp-2 flex-1 text-sm font-medium text-gray-900">{produto.nome}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-700 focus:outline-none"
            aria-label={`Opções de ${produto.nome}`}
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(produto.id)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleDisponivel(produto.id, !produto.disponivel)}>
              {produto.disponivel ? 'Ocultar' : 'Mostrar'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(produto.id)}>Duplicar</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(produto)}
              className="text-red-600 focus:text-red-600"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Preço */}
      <div className="mt-2 flex items-baseline gap-2">
        {isPromo ? (
          <>
            <span className="text-base font-semibold text-emerald-600">
              R$ {produto.precoPromocional!.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-xs text-gray-400 line-through">
              R$ {produto.preco.toFixed(2).replace('.', ',')}
            </span>
          </>
        ) : (
          <span className="text-base font-semibold text-gray-900">
            R$ {produto.preco.toFixed(2).replace('.', ',')}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="mt-2 flex flex-wrap gap-1">
        {!produto.disponivel && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Oculto
          </span>
        )}
        {produto.estoqueAtivo && produto.estoque === 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Em falta
          </span>
        )}
        {produto.disponivel && (!produto.estoqueAtivo || produto.estoque > 0) && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Ativo
          </span>
        )}
      </div>
    </div>
  )
}
