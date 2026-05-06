'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Coupon = {
  id: number
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  minOrderValue?: number
  expiresAt?: string
  validUntil?: string
  active: boolean
  usedCount?: number
  limiteUso?: number | null
  maxUses?: number | null
  limitePorCliente?: number | null
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CuponsPage() {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }
    const res = await fetch(`${API_URL}/coupons`, { headers: { Authorization: `Bearer ${token}` } })
    if (handleUnauthorized(res)) return
    setCoupons(await res.json() as Coupon[])
  }, [])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  async function toggleActive(coupon: Coupon) {
    const token = getToken()
    if (!token) return
    setTogglingId(coupon.id)
    try {
      const res = await fetch(`${API_URL}/coupons/${coupon.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao atualizar cupom.'); return }
      setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, active: !c.active } : c))
      toast.success(coupon.active ? 'Cupom desativado' : 'Cupom ativado')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const token = getToken()
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/coupons/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) { toast.error('Erro ao excluir cupom.'); return }
      setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Cupom excluído')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Cupons"
        description="Crie cupons de desconto para seus clientes."
        actions={
          <Button className="bg-brand-red hover:bg-brand-red/90" onClick={() => router.push('/dashboard/cupons/novo')}>
            Novo cupom
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-100" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-white py-16 shadow-sm">
          <p className="text-sm text-zinc-500">Nenhum cupom cadastrado.</p>
          <Button className="bg-brand-red hover:bg-brand-red/90" size="sm" onClick={() => router.push('/dashboard/cupons/novo')}>
            Criar primeiro cupom
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Valor</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Mínimo</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Validade</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Usos</th>
                <th className="px-4 py-3 text-center">Ativo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono font-bold text-zinc-900">{coupon.code}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                    {coupon.type === 'PERCENT' ? '% desconto' : 'R$ fixo'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 hidden sm:table-cell">
                    {coupon.type === 'PERCENT' ? `${coupon.value}%` : fmt(coupon.value)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500 hidden lg:table-cell">
                    {coupon.minOrderValue ? fmt(coupon.minOrderValue) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden lg:table-cell">
                    {coupon.expiresAt || coupon.validUntil ? new Date(coupon.expiresAt ?? coupon.validUntil ?? '').toLocaleDateString('pt-BR') : 'Sem validade'}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500 hidden lg:table-cell">
                    {coupon.usedCount ?? 0}{coupon.limiteUso ?? coupon.maxUses ? ` / ${coupon.limiteUso ?? coupon.maxUses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={togglingId === coupon.id}
                      onClick={() => void toggleActive(coupon)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        coupon.active ? 'bg-brand-red' : 'bg-zinc-200',
                        togglingId === coupon.id && 'opacity-50',
                      )}
                    >
                      <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', coupon.active ? 'translate-x-4' : 'translate-x-1')} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(coupon)}>
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cupom?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O cupom <strong>"{deleteTarget?.code}"</strong> será removido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button disabled={deleting} className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
