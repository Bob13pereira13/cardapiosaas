'use client'

import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'

export type MarketplaceProvider = 'IFOOD' | 'NINETYNINEFOOD' | 'KEETA'

export type ActiveMarketplace = {
  marketplace: MarketplaceProvider
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

export type ActiveMarketplacesMap = Record<MarketplaceProvider, boolean>

export function useActiveMarketplaces() {
  const [data, setData] = useState<ActiveMarketplace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetch(`${API_URL}/marketplace-integrations/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ active: ActiveMarketplace[] }>
      })
      .then((d) => setData(d.active ?? []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  function isActive(provider: MarketplaceProvider): boolean {
    return data.some((m) => m.marketplace === provider && m.isActive)
  }

  const asMap: ActiveMarketplacesMap = {
    IFOOD: isActive('IFOOD'),
    NINETYNINEFOOD: isActive('NINETYNINEFOOD'),
    KEETA: isActive('KEETA'),
  }

  return { data, loading, error, isActive, asMap }
}
