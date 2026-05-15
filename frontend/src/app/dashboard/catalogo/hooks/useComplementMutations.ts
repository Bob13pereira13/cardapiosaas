'use client'

import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { ComplementOptionDto } from '@/lib/complement-types'

interface UpdateOptionPayload {
  extraPrice?: number
  isLocked?: boolean
  isVisible?: boolean
  sortOrder?: number
}

export function useComplementMutations() {
  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  })

  return {
    addOption: async (
      complementId: number,
      optionId: number,
      extraPrice = 0,
    ): Promise<ComplementOptionDto> => {
      const res = await fetch(`${API_URL}/complements/${complementId}/options`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ optionId, extraPrice }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(err?.message ?? 'Erro ao adicionar opção')
      }
      return res.json() as Promise<ComplementOptionDto>
    },

    removeOption: async (complementId: number, optionId: number): Promise<void> => {
      const res = await fetch(`${API_URL}/complements/${complementId}/options/${optionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(err?.message ?? 'Erro ao remover opção')
      }
    },

    updateOption: async (
      complementId: number,
      optionId: number,
      updates: UpdateOptionPayload,
    ): Promise<ComplementOptionDto> => {
      const res = await fetch(`${API_URL}/complements/${complementId}/options/${optionId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(err?.message ?? 'Erro ao atualizar opção')
      }
      return res.json() as Promise<ComplementOptionDto>
    },

    reorderOptions: async (complementId: number, optionIds: number[]): Promise<void> => {
      const res = await fetch(`${API_URL}/complements/${complementId}/reorder-options`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ optionIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(err?.message ?? 'Erro ao reordenar opções')
      }
    },
  }
}
