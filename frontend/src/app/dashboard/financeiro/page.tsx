'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Download, Wallet } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Period = 'TODAY' | 'WEEK' | 'MONTH'
type Payment = { orderId: number; orderNumber: number; customerName: string; paymentMethod: string; paymentStatus: string; total: number; createdAt: string }
type Summary = { totalBruto: number; totalTaxas: number; totalLiquido: number; totalPendente: number; payments: Payment[] }

const periods: Array<{ key: Period; label: string }> = [
  { key: 'TODAY', label: 'Hoje' },
  { key: 'WEEK', label: '7 dias' },
  { key: 'MONTH', label: '30 dias' },
]

const statusLabels: Record<string, string> = { ALL: 'Todos', PAID: 'Pago', PENDING: 'Pendente', FAILED: 'Falhou' }
const statusClass: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FinanceiroPage() {
  const [period, setPeriod] = useState<Period>('WEEK')
  const [status, setStatus] = useState('ALL')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const token = getToken()
      if (!token) { window.location.href = '/login'; return }
      const res = await fetch(`${API_URL}/financial/summary?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleUnauthorized(res)) return
      if (res.ok) setSummary(await res.json())
      setLoading(false)
    }
    void load()
  }, [period])

  const payments = useMemo(() => {
    const all = summary?.payments ?? []
    return status === 'ALL' ? all : all.filter((payment) => payment.paymentStatus === status)
  }, [summary, status])

  function exportCsv() {
    const rows = [['Pedido', 'Cliente', 'Método', 'Status', 'Valor', 'Data'], ...payments.map((payment) => [
      String(payment.orderNumber),
      payment.customerName,
      payment.paymentMethod,
      payment.paymentStatus,
      String(payment.total),
      payment.createdAt,
    ])]
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'financeiro.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro" description="Pagamentos e recebíveis por período." actions={<Button variant="outline" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar CSV</Button>} />

      <div className="flex flex-wrap gap-2">
        {periods.map((item) => <Button key={item.key} variant={period === item.key ? 'default' : 'outline'} className={period === item.key ? 'bg-brand-red hover:bg-brand-red/90' : ''} onClick={() => setPeriod(item.key)}>{item.label}</Button>)}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Total bruto', summary?.totalBruto ?? 0, 'bg-white'],
          ['Total em taxas', summary?.totalTaxas ?? 0, 'bg-red-50'],
          ['Total líquido', summary?.totalLiquido ?? 0, 'bg-emerald-50'],
          ['Total pendente', summary?.totalPendente ?? 0, 'bg-yellow-50'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className={cn('rounded-lg border p-5 shadow-sm', String(color))}>
            <p className="text-sm text-zinc-500">{label}</p>
            <strong className="mt-2 block text-2xl text-zinc-950">{loading ? '...' : fmt(Number(value))}</strong>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Pagamentos</h2>
          <div className="flex gap-2">
            {['ALL', 'PAID', 'PENDING', 'FAILED'].map((item) => <Button key={item} size="sm" variant={status === item ? 'default' : 'outline'} className={status === item ? 'bg-brand-red hover:bg-brand-red/90' : ''} onClick={() => setStatus(item)}>{statusLabels[item]}</Button>)}
          </div>
        </div>
        {payments.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 py-14 text-zinc-500"><Wallet className="h-9 w-9 text-zinc-300" /> Nenhum pagamento no período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-left">Cliente</th><th className="px-4 py-3 text-left">Método</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-left">Data</th></tr></thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.orderId}>
                    <td className="px-4 py-3 font-medium">#{payment.orderNumber}</td>
                    <td className="px-4 py-3">{payment.customerName}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-zinc-400" /> {payment.paymentMethod}</span></td>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass[payment.paymentStatus] ?? 'bg-zinc-100 text-zinc-600')}>{payment.paymentStatus}</span></td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(payment.total)}</td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(payment.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
