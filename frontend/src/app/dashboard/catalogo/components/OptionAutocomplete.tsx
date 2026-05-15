'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, Plus } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { OptionDto } from '@/lib/option-types'

interface OptionAutocompleteProps {
  excludeOptionIds: number[]
  onSelect: (option: OptionDto) => void
  onCreateNew: (initialName: string) => void
  disabled?: boolean
}

export function OptionAutocomplete({
  excludeOptionIds,
  onSelect,
  onCreateNew,
  disabled,
}: OptionAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<OptionDto[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const excludeKey = JSON.stringify(excludeOptionIds)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Fetch on debounced query change
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`${API_URL}/options?search=${encodeURIComponent(debouncedQuery)}&limit=10`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data: { data?: OptionDto[] } | OptionDto[]) => {
        const excluded = JSON.parse(excludeKey) as number[]
        const list = Array.isArray(data) ? data : (data.data ?? [])
        setResults(list.filter((o) => !excluded.includes(o.id)))
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, excludeKey])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(option: OptionDto) {
    onSelect(option)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  function handleCreateNew() {
    onCreateNew(query)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const hasExactMatch = results.some(
    (o) => o.name.toLowerCase() === query.toLowerCase(),
  )
  const showCreateNew = query.length > 0 && !hasExactMatch

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false)
          }}
          placeholder="Busque uma opção ou digite pra criar nova..."
          disabled={disabled}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red disabled:opacity-50"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {isOpen && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-60 overflow-y-auto py-1">
            {loading && results.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando...
              </li>
            )}

            {!loading && results.length === 0 && !showCreateNew && (
              <li className="px-3 py-2 text-sm text-gray-500">Nenhuma opção encontrada</li>
            )}

            {results.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(option)
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded bg-gray-100">
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt={option.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="m-1 h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{option.name}</p>
                    {option.stockStatus === 'OUT_OF_STOCK' && (
                      <p className="text-xs text-amber-700">Em falta</p>
                    )}
                  </div>
                </button>
              </li>
            ))}

            {showCreateNew && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleCreateNew()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-red hover:bg-brand-red/5"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Criar nova opção &ldquo;{query}&rdquo;
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
