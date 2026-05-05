'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Client = {
  id: number
  isActive: boolean
  subscriptionStatus: string
}

export default function AdminDashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = getAdminToken()
      if (!token) {
        window.location.href = '/admin/login'
        return
      }

      const res = await fetch(`${API_URL}/admin/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleAdminUnauthorized(res)) return

      setClients(await res.json())
      setLoading(false)
    }

    void load()
  }, [])

  const active = clients.filter((client) => client.isActive).length
  const trial = clients.filter(
    (client) => client.subscriptionStatus === 'TRIAL',
  ).length

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel admin</h1>
          <p style={styles.subtitle}>Visao geral dos clientes do SaaS</p>
        </div>
        <Link href="/admin/clientes" style={styles.link}>
          Ver clientes
        </Link>
      </header>

      <section style={styles.grid}>
        <div style={styles.card}>
          <span style={styles.label}>Clientes</span>
          <strong style={styles.value}>{loading ? '-' : clients.length}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.label}>Ativos</span>
          <strong style={styles.value}>{loading ? '-' : active}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.label}>Em trial</span>
          <strong style={styles.value}>{loading ? '-' : trial}</strong>
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  grid: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  label: { display: 'block', color: '#6b7280', fontSize: 14, marginBottom: 8 },
  value: { color: '#111827', fontSize: 32 },
}
