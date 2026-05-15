'use client'

import { useEffect, useState, useCallback } from 'react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from '@/lib/category-types'

export function useCategorias() {
  const [data, setData] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetcher = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? `Erro ${res.status}`)
      const json = await res.json() as unknown[]
      const list = Array.isArray(json) ? json : ((json as { data?: unknown[] }).data ?? [])
      setData(
        (list as Array<CategoryDto & { products?: unknown[] }>).map((cat) => ({
          id: cat.id,
          nome: cat.nome,
          displayOrder: cat.displayOrder,
          ativa: cat.ativa,
          icone: cat.icone,
          restaurantId: cat.restaurantId,
          productsCount: cat.products?.length ?? cat.productsCount,
        })),
      )
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetcher() }, [fetcher])

  const headers = () => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  })

  return {
    data,
    loading,
    error,
    refetch: fetcher,

    create: async (input: CreateCategoryInput): Promise<CategoryDto> => {
      const res = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao criar categoria')
      return res.json() as Promise<CategoryDto>
    },

    update: async (id: number, input: UpdateCategoryInput): Promise<CategoryDto> => {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao atualizar')
      return res.json() as Promise<CategoryDto>
    },

    remove: async (id: number): Promise<void> => {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao remover')
    },
  }
}
