'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AdminCoupon = {
  id: number
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  expiresAt: string
  usedCount: number
  active: boolean
}

const INITIAL_COUPONS: AdminCoupon[] = [
  { id: 1, code: 'PRO20', type: 'PERCENT', value: 20, expiresAt: '2026-06-30', usedCount: 14, active: true },
  { id: 2, code: 'LANCA50', type: 'FIXED', value: 50, expiresAt: '2026-05-31', usedCount: 6, active: true },
  { id: 3, code: 'ENTERPRISE', type: 'PERCENT', value: 10, expiresAt: '2026-12-31', usedCount: 2, active: false },
]

export default function AdminCuponsPage() {
  const [coupons, setCoupons] = useState(INITIAL_COUPONS)

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Cupons admin</h1>
            <p className="text-sm text-zinc-500">Cupons comerciais para assinatura do SaaS.</p>
          </div>
          <Button asChild className="gap-2 bg-zinc-950 text-white hover:bg-zinc-800">
            <Link href="/admin/cupons/novo">
              <Plus className="h-4 w-4" />
              Novo cupom
            </Link>
          </Button>
        </header>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Validade</th>
                <th className="px-4 py-3 text-right">Usos</th>
                <th className="px-4 py-3 text-center">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-mono font-bold text-zinc-950">{coupon.code}</td>
                  <td className="px-4 py-3 text-zinc-600">{coupon.type === 'PERCENT' ? 'Percentual' : 'Valor fixo'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-950">{coupon.type === 'PERCENT' ? `${coupon.value}%` : `R$ ${coupon.value}`}</td>
                  <td className="px-4 py-3 text-zinc-600">{new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{coupon.usedCount}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setCoupons((current) => current.map((item) => item.id === coupon.id ? { ...item, active: !item.active } : item))}
                      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition', coupon.active ? 'bg-zinc-950' : 'bg-zinc-200')}
                    >
                      <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', coupon.active ? 'translate-x-4' : 'translate-x-1')} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
