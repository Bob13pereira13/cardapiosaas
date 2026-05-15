'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { ComplementDto } from '@/lib/complement-types'
import { useComplements } from '../hooks/useComplements'
import { ComplementoCard } from '../components/ComplementoCard'
import { ComplementosEmpty } from '../components/ComplementosEmpty'
import { CatalogoErrorBoundary } from '../components/CatalogoErrorBoundary'
import { ComplementoFormModal } from '../components/ComplementoFormModal'
import { ConfirmDeleteComplementDialog } from '../components/ConfirmDeleteComplementDialog'

export default function ComplementosPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [deletingComplement, setDeletingComplement] = useState<ComplementDto | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, loading, error, refetch } = useComplements({
    search,
    includeUsage: true,
  })

  const handleCreate = () => setEditingId('new')
  const handleEdit = (id: number) => setEditingId(id)
  const handleDelete = (complement: ComplementDto) => setDeletingComplement(complement)

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
            placeholder="Pesquise por um complemento"
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
          />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
        >
          <Plus className="h-4 w-4" />
          Novo complemento
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
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
        <ComplementosEmpty onCreateFirst={handleCreate} />
      )}

      {/* Empty — with search */}
      {!loading && !error && data.length === 0 && search && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Nenhum complemento encontrado para &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Grid */}
      {!loading && !error && data.length > 0 && (
        <CatalogoErrorBoundary>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((complement) => (
              <ComplementoCard
                key={complement.id}
                complement={complement}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </CatalogoErrorBoundary>
      )}

      <ComplementoFormModal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        complementId={editingId}
        onSaved={() => {
          setEditingId(null)
          refetch()
        }}
      />

      <ConfirmDeleteComplementDialog
        complement={deletingComplement}
        onClose={() => setDeletingComplement(null)}
        onDeleted={() => {
          setDeletingComplement(null)
          refetch()
        }}
      />
    </div>
  )
}
