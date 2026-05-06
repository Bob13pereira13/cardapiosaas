'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Client = {
  id: number
  nome: string
  email: string
  slug?: string | null
  plan: string
  subscriptionStatus: string
  isActive: boolean
  _count?: { products: number; orders: number; categories: number }
}

export default function AdminClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    async function load() {
      const token = getAdminToken()
      if (!token) { window.location.href = '/admin/login'; return }
      const res = await fetch(`${API_URL}/admin/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleAdminUnauthorized(res)) return
      if (res.ok) setClient(await res.json())
    }
    void load()
  }, [id])

  return (
    <main style={styles.page}>
      <header style={styles.header}><div><h1 style={styles.title}>{client?.nome ?? 'Cliente'}</h1><p style={styles.subtitle}>{client?.email ?? 'Carregando...'}</p></div><Link style={styles.link} href="/admin/clientes">Clientes</Link></header>
      <section style={styles.grid}>
        <Card label="Status" value={client?.isActive ? 'Ativo' : 'Inativo'} />
        <Card label="Plano" value={client?.plan ?? '-'} />
        <Card label="Assinatura" value={client?.subscriptionStatus ?? '-'} />
        <Card label="Pedidos" value={String(client?._count?.orders ?? 0)} />
      </section>
      <nav style={styles.nav}>
        <Link href={`/admin/clientes/${id}/assinatura`}>Assinatura</Link>
        <Link href={`/admin/clientes/${id}/pedidos`}>Pedidos</Link>
        <Link href={`/admin/clientes/${id}/financeiro`}>Financeiro</Link>
      </nav>
    </main>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return <div style={styles.card}><span>{label}</span><strong>{value}</strong></div>
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1000, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  grid: { maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
  card: { background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', display: 'grid', gap: 6 },
  nav: { maxWidth: 1000, margin: '18px auto 0', display: 'flex', gap: 10, flexWrap: 'wrap' },
}
