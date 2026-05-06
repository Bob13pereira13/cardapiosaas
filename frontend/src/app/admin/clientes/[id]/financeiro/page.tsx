'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Payment = { id: number; total: number; paymentStatus: string; user: { id: number } }

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminClienteFinanceiroPage() {
  const { id } = useParams<{ id: string }>()
  const [orders, setOrders] = useState<Payment[]>([])
  useEffect(() => {
    async function load() {
      const token = getAdminToken()
      if (!token) { window.location.href = '/admin/login'; return }
      const res = await fetch(`${API_URL}/admin/payments`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleAdminUnauthorized(res)) return
      if (res.ok) {
        const data: Payment[] = await res.json()
        setOrders(data.filter((order) => String(order.user.id) === id))
      }
    }
    void load()
  }, [id])
  const paid = orders.filter((order) => order.paymentStatus === 'PAID')
  return (
    <main style={styles.page}>
      <header style={styles.header}><div><h1 style={styles.title}>Financeiro do cliente</h1><p style={styles.subtitle}>Resumo de pagamentos</p></div><Link style={styles.link} href={`/admin/clientes/${id}`}>Voltar</Link></header>
      <section style={styles.grid}>
        <div style={styles.card}><span>Processado</span><strong>{fmt(orders.reduce((sum, order) => sum + order.total, 0))}</strong></div>
        <div style={styles.card}><span>Pago</span><strong>{fmt(paid.reduce((sum, order) => sum + order.total, 0))}</strong></div>
        <div style={styles.card}><span>Transações</span><strong>{orders.length}</strong></div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  grid: { maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', display: 'grid', gap: 8 },
}
