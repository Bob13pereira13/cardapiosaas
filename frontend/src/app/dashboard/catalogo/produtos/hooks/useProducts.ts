'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { ProductDto, ListProductsResponse } from '@/lib/product-types'

export interface UseProductsParams {
  search?: string
}

export interface UseProductsResult {
  data: ProductDto[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  remove: (id: number) => Promise<void>
  toggleDisponivel: (id: number, next: boolean) => Promise<void>
  duplicate: (id: number) => Promise<void>
}

export function useProducts(params: UseProductsParams = {}): UseProductsResult {
  const [raw, setRaw] = useState<ProductDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetcher = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/products?limit=500`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? `Erro ${res.status}`)
      const json = await res.json() as ListProductsResponse
      setRaw(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetcher() }, [fetcher])

  const data = useMemo(() => {
    if (!params.search) return raw
    const q = params.search.toLowerCase()
    return raw.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        (p.codePdv?.toLowerCase().includes(q) ?? false),
    )
  }, [raw, params.search])

  const headers = () => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  })

  return {
    data,
    total,
    loading,
    error,
    refetch: fetcher,

    remove: async (id) => {
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: headers() })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao remover')
    },

    toggleDisponivel: async (id, next) => {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ disponivel: next }),
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao atualizar')
    },

    duplicate: async (id) => {
      const res = await fetch(`${API_URL}/products/${id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao duplicar')
    },
  }
}
