'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Logs = {
  orders: { id: number; orderNumber: number; orderStatus: string; paymentStatus: string; createdAt: string; user: { nome: string } }[]
  clients: { id: number; nome: string; email: string; createdAt: string }[]
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Logs | null>(null)

  useEffect(() => {
    async function load() {
      const token = getAdminToken()
      if (!token) { window.location.href = '/admin/login'; return }
      const res = await fetch(`${API_URL}/admin/logs`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleAdminUnauthorized(res)) return
      if (res.ok) setLogs(await res.json())
    }
    void load()
  }, [])

  return (
    <main style={styles.page}>
      <header style={styles.header}><div><h1 style={styles.title}>Logs</h1><p style={styles.subtitle}>Eventos recentes do SaaS</p></div><Link href="/admin/dashboard" style={styles.link}>Dashboard</Link></header>
      <section style={styles.grid}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Pedidos recentes</h2>
          {(logs?.orders ?? []).map((order) => (
            <div key={order.id} style={styles.row}>Pedido #{order.orderNumber} em {order.user.nome} <span>{order.orderStatus} / {order.paymentStatus}</span></div>
          ))}
        </div>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Clientes recentes</h2>
          {(logs?.clients ?? []).map((client) => (
            <div key={client.id} style={styles.row}>{client.nome} <span>{client.email}</span></div>
          ))}
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  grid: { maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' },
  panel: { background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  panelTitle: { margin: '0 0 12px', fontSize: 18, color: '#111827' },
  row: { borderTop: '1px solid #f3f4f6', padding: '12px 0', color: '#111827', fontSize: 14, display: 'flex', justifyContent: 'space-between', gap: 12 },
}
