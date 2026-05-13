'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

export type TrendPeriod =
  | 'current_month'
  | 'current_week'
  | 'current_year'
  | 'last_7d'
  | 'last_30d'
  | 'last_90d'
  | 'last_12m'
  | 'last_24m'

export type Granularity = 'day' | 'month'

// --- Summary types ---
export type SummaryCard = {
  current: number
  previous: number
  change: number
  changePercent: number
}
export type SummaryResponse = {
  period: string
  from: string
  to: string
  cards: {
    revenue: SummaryCard
    orders: SummaryCard
    averageTicket: SummaryCard
    newCustomers: SummaryCard
  }
}

// --- Revenue types ---
export type RevenuePoint = { date: string; revenue: number; orders: number }
export type RevenueResponse = {
  granularity: Granularity
  period: string
  data: RevenuePoint[]
  summary: { total: number; totalOrders: number; averageDaily: number }
}

// --- Top products types ---
export type TopProduct = {
  productId: number | null
  name: string
  totalQuantity: number
  totalRevenue: number
}
export type TopProductsResponse = {
  period: string
  from: string
  to: string
  orderBy: 'revenue' | 'quantity'
  limit: number
  products: TopProduct[]
}

// --- Origin types ---
export type OriginPoint = {
  origin: string
  orders: number
  revenue: number
  percentage: number
}
export type OriginResponse = {
  period: string
  from: string
  to: string
  totalRevenue: number
  origins: OriginPoint[]
}

// --- Heatmap types ---
export type HeatmapCell = { hour: number; orders: number; revenue: number }
export type HeatmapDay = { dayOfWeek: number; dayName: string; hours: HeatmapCell[] }
export type HeatmapResponse = {
  period: string
  from: string
  to: string
  matrix: HeatmapDay[]
  peak: { dayOfWeek: number; hour: number; orders: number } | null
}

// Summary only supports current_* periods — map last_* to nearest equivalent
export function toSummaryPeriod(
  period: TrendPeriod,
): 'current_month' | 'current_week' | 'current_year' {
  if (period === 'current_week' || period === 'last_7d') return 'current_week'
  if (
    period === 'current_year' ||
    period === 'last_12m' ||
    period === 'last_24m'
  )
    return 'current_year'
  return 'current_month'
}

type FetchState<T> = { data: T | null; loading: boolean; error: string | null }

function useTrendsFetch<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    if (!url) return
    const token = getToken()
    if (!token) {
      window.location.href = '/login'
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: T = await res.json()
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: String(err) })
    }
  }, [url])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return state
}

export function useTrendsSummary(period: TrendPeriod) {
  const mapped = toSummaryPeriod(period)
  const url = `${API_URL}/reports/trends/summary?period=${mapped}`
  return useTrendsFetch<SummaryResponse>(url)
}

export function useTrendsRevenue(granularity: Granularity, period: TrendPeriod) {
  const url = `${API_URL}/reports/trends/revenue?granularity=${granularity}&period=${period}`
  return useTrendsFetch<RevenueResponse>(url)
}

export function useTrendsTopProducts(
  period: TrendPeriod,
  limit = 10,
  orderBy: 'revenue' | 'quantity' = 'revenue',
) {
  const url = `${API_URL}/reports/trends/products/top?period=${period}&limit=${limit}&orderBy=${orderBy}`
  return useTrendsFetch<TopProductsResponse>(url)
}

export function useTrendsOrigin(period: TrendPeriod) {
  const url = `${API_URL}/reports/trends/origin?period=${period}`
  return useTrendsFetch<OriginResponse>(url)
}

export function useTrendsHeatmap(period: 'last_7d' | 'last_30d' | 'last_90d') {
  const url = `${API_URL}/reports/trends/heatmap?period=${period}`
  return useTrendsFetch<HeatmapResponse>(url)
}
