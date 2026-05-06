'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Payment = { id: number; orderNumber: number; total: number; paymentStatus: string; user: { id: number; nome: string } }

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminClientePedidosPage() {
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
  return (
    <main style={styles.page}>
      <header style={styles.header}><div><h1 style={styles.title}>Pedidos do cliente</h1><p style={styles.subtitle}>Histórico administrativo</p></div><Link style={styles.link} href={`/admin/clientes/${id}`}>Voltar</Link></header>
      <section style={styles.panel}>
        {orders.map((order) => <div key={order.id} style={styles.row}>#{order.orderNumber}<span>{order.paymentStatus}</span><strong>{fmt(order.total)}</strong></div>)}
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 800, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  panel: { maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  row: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', padding: '12px 0', color: '#111827' },
}
