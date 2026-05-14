'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import { OptionDto } from '@/lib/option-types'

export interface UseOptionsParams {
  search?: string
  isActive?: boolean
  stockStatus?: string
  includeUsage?: boolean
  page?: number
  limit?: number
}

export interface UseOptionsResult {
  data: OptionDto[]
  total: number
  page: number
  totalPages: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useOptions(params: UseOptionsParams = {}): UseOptionsResult {
  const [data, setData] = useState<OptionDto[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paramsKey = JSON.stringify(params)

  const fetcher = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params.search) query.set('search', params.search)
      if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
      if (params.stockStatus) query.set('stockStatus', params.stockStatus)
      if (params.includeUsage) query.set('includeUsage', 'true')
      query.set('page', String(params.page ?? 1))
      query.set('limit', String(params.limit ?? 24))

      const res = await fetch(`${API_URL}/options?${query}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error((err as { message?: string })?.message ?? `Erro ${res.status}`)
      }
      const json = await res.json()
      setData(json.data ?? [])
      setMeta({
        total: json.total ?? 0,
        page: json.page ?? 1,
        totalPages: json.totalPages ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
    // paramsKey is the stable serialization of params — correct dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => {
    fetcher()
  }, [fetcher])

  return { data, ...meta, loading, error, refetch: fetcher }
}
