'use client'

import { ImageIcon, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OptionDto, OptionStockStatus } from '@/lib/option-types'

interface Props {
  option: OptionDto
  onEdit: (id: number) => void
  onDelete: (option: OptionDto) => void
  onToggleStock: (id: number, current: OptionStockStatus) => void
}

const STATUS_CONFIG: Record<
  OptionStockStatus,
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Ativa', className: 'bg-emerald-50 text-emerald-700' },
  OUT_OF_STOCK: { label: 'Em falta', className: 'bg-amber-50 text-amber-700' },
  HIDDEN: { label: 'Inativa', className: 'bg-gray-100 text-gray-600' },
}

export function OpcaoCard({ option, onEdit, onDelete, onToggleStock }: Props) {
  const status = option.isActive ? option.stockStatus : 'HIDDEN'
  const { label, className } = STATUS_CONFIG[status]

  const usageLabel =
    option.usedInComplements && option.usedInComplements > 0
      ? `Usado em ${option.usedInComplements} complemento${option.usedInComplements > 1 ? 's' : ''}`
      : 'Não usado em nenhum complemento'

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {option.imageUrl ? (
          <img
            src={option.imageUrl}
            alt={option.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium text-gray-900">{option.name}</p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Opções"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(option.id)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStock(option.id, option.stockStatus)}>
                {option.stockStatus === 'ACTIVE' ? 'Marcar em falta' : 'Marcar disponível'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(option)}
                className="text-red-600 focus:text-red-600"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span
          className={`mt-2 inline-flex w-fit items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
        >
          {label}
        </span>

        <p className="mt-2 text-xs text-gray-500">{usageLabel}</p>
      </div>
    </div>
  )
}
