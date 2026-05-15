'use client'

import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ComplementDto } from '@/lib/complement-types'
import { SELECTION_RULE_LABELS } from '@/lib/complement-types'

interface Props {
  complement: ComplementDto
  onEdit: (id: number) => void
  onDelete: (complement: ComplementDto) => void
}

function buildRuleLabel(complement: ComplementDto): string {
  const base = SELECTION_RULE_LABELS[complement.selectionRule]
  if (complement.selectionRule === 'SINGLE') {
    return complement.minSelections > 0 ? `${base} (obrigatória)` : base
  }
  const parts: string[] = []
  if (complement.minSelections > 0) parts.push(`mín. ${complement.minSelections}`)
  if (complement.maxSelections > 0) parts.push(`máx. ${complement.maxSelections}`)
  return parts.length > 0 ? `${base} (${parts.join(', ')})` : base
}

function buildOptionsPreview(complement: ComplementDto): string {
  const names = complement.options.map((o) => o.option.name)
  if (names.length === 0) return 'Nenhuma opção'
  if (names.length <= 3) return names.join(', ')
  const rest = names.length - 3
  return `${names.slice(0, 3).join(', ')}, +${rest} mais`
}

export function ComplementoCard({ complement, onEdit, onDelete }: Props) {
  const ruleLabel = buildRuleLabel(complement)
  const optionsPreview = buildOptionsPreview(complement)

  const usageBadge =
    complement.usedInProducts && complement.usedInProducts > 0
      ? {
          label: `Usado em ${complement.usedInProducts} produto${complement.usedInProducts > 1 ? 's' : ''}`,
          className: 'bg-emerald-50 text-emerald-700',
        }
      : { label: 'Não usado em nenhum produto', className: 'bg-gray-100 text-gray-600' }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-medium text-gray-900">{complement.name}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label={`Opções de ${complement.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(complement.id)}>Editar</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(complement)}
              className="text-red-600 focus:text-red-600"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Regra de seleção */}
      <p className="mt-1 text-xs text-gray-500">{ruleLabel}</p>

      {/* Preview das opções */}
      {complement.options.length > 0 && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">{optionsPreview}</p>
      )}

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${usageBadge.className}`}
        >
          {usageBadge.label}
        </span>
        {!complement.isActive && (
          <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Inativo
          </span>
        )}
      </div>
    </div>
  )
}
