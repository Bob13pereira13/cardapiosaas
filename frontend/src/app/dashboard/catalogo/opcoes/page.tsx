'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import { OptionDto, OptionStockStatus } from '@/lib/option-types'
import { useOptions } from '../hooks/useOptions'
import { OpcaoCard } from '../components/OpcaoCard'
import { OpcoesEmpty } from '../components/OpcoesEmpty'
import { OpcaoFormModal } from '../components/OpcaoFormModal'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { CatalogoErrorBoundary } from '../components/CatalogoErrorBoundary'

export default function OpcoesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [deletingOption, setDeletingOption] = useState<OptionDto | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, loading, error, refetch } = useOptions({
    search,
    includeUsage: true,
  })

  const handleCreate = () => setEditingId('new')
  const handleEdit = (id: number) => setEditingId(id)
  const handleDelete = (option: OptionDto) => setDeletingOption(option)

  async function handleToggleStock(id: number, current: OptionStockStatus) {
    const newStatus = current === 'OUT_OF_STOCK' ? 'ACTIVE' : 'OUT_OF_STOCK'
    try {
      const res = await fetch(`${API_URL}/options/${id}/stock-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockStatus: newStatus }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar status')
      toast.success(newStatus === 'OUT_OF_STOCK' ? 'Marcada em falta' : 'Marcada disponível')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status')
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pesquise por uma opção"
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
          />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
        >
          <Plus className="h-4 w-4" />
          Nova opção
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Empty — no search */}
      {!loading && !error && data.length === 0 && !search && (
        <OpcoesEmpty onCreateFirst={handleCreate} />
      )}

      {/* Empty — with search */}
      {!loading && !error && data.length === 0 && search && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Nenhuma opção encontrada para &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Grid */}
      {!loading && !error && data.length > 0 && (
        <CatalogoErrorBoundary>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((option) => (
              <OpcaoCard
                key={option.id}
                option={option}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStock={handleToggleStock}
              />
            ))}
          </div>
        </CatalogoErrorBoundary>
      )}

      <OpcaoFormModal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        optionId={editingId}
        onSaved={() => {
          setEditingId(null)
          refetch()
        }}
      />

      <ConfirmDeleteDialog
        option={deletingOption}
        onClose={() => setDeletingOption(null)}
        onDeleted={() => {
          setDeletingOption(null)
          refetch()
        }}
      />
    </div>
  )
}
