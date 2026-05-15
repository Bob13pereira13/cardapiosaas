'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { ComplementDto, ComplementSelectionRule } from '@/lib/complement-types'

interface UseComplementsParams {
  search?: string
  selectionRule?: ComplementSelectionRule | ''
  isActive?: boolean
  includeUsage?: boolean
  page?: number
  limit?: number
}

interface UseComplementsResult {
  data: ComplementDto[]
  total: number
  page: number
  totalPages: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useComplements(params: UseComplementsParams = {}): UseComplementsResult {
  const [data, setData] = useState<ComplementDto[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const paramsKey = JSON.stringify(params)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const p = JSON.parse(paramsKey) as UseComplementsParams
      const query = new URLSearchParams()
      if (p.search) query.set('search', p.search)
      if (p.selectionRule) query.set('selectionRule', p.selectionRule)
      if (p.isActive !== undefined) query.set('isActive', String(p.isActive))
      if (p.includeUsage) query.set('includeUsage', 'true')
      if (p.page) query.set('page', String(p.page))
      if (p.limit) query.set('limit', String(p.limit))

      const res = await fetch(`${API_URL}/complements?${query.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(err?.message ?? `Erro ${res.status}`)
      }
      const json = await res.json() as { data: ComplementDto[]; total: number; page: number; totalPages: number }
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
      setCurrentPage(json.page ?? 1)
      setTotalPages(json.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar complementos')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, tick])

  useEffect(() => {
    void fetch_()
  }, [fetch_])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { data, total, page: currentPage, totalPages, loading, error, refetch }
}
