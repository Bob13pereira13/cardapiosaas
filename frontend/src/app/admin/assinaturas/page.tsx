'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Subscription = {
  id: number
  nome: string
  email: string
  plan: string
  subscriptionStatus: string
  trialEndsAt?: string | null
  asaasSubscriptionId?: string | null
}

export default function AdminAssinaturasPage() {
  const [items, setItems] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = getAdminToken()
      if (!token) { window.location.href = '/admin/login'; return }
      const res = await fetch(`${API_URL}/admin/subscriptions`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleAdminUnauthorized(res)) return
      if (res.ok) setItems(await res.json())
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <main style={styles.page}>
      <Header title="Assinaturas" />
      <Panel>
        {loading ? <p style={styles.empty}>Carregando...</p> : (
          <table style={styles.table}>
            <thead><tr><Th>Cliente</Th><Th>Plano</Th><Th>Status</Th><Th>Asaas</Th><Th>Ações</Th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td><strong>{item.nome}</strong><br /><span style={styles.muted}>{item.email}</span></Td>
                  <Td>{item.plan}</Td>
                  <Td><Badge>{item.subscriptionStatus}</Badge></Td>
                  <Td>{item.asaasSubscriptionId ?? '-'}</Td>
                  <Td><Link style={styles.linkSmall} href={`/admin/clientes/${item.id}/assinatura`}>Abrir</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </main>
  )
}

function Header({ title }: { title: string }) {
  return <header style={styles.header}><div><h1 style={styles.title}>{title}</h1><p style={styles.subtitle}>Operação interna do SaaS</p></div><Link style={styles.link} href="/admin/dashboard">Dashboard</Link></header>
}
function Panel({ children }: { children: React.ReactNode }) { return <section style={styles.panel}>{children}</section> }
function Th({ children }: { children: React.ReactNode }) { return <th style={styles.th}>{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td style={styles.td}>{children}</td> }
function Badge({ children }: { children: React.ReactNode }) { return <span style={styles.badge}>{children}</span> }

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  linkSmall: { color: '#111827', fontWeight: 'bold' },
  panel: { maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', overflowX: 'auto' },
  empty: { color: '#6b7280' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 8px', color: '#6b7280', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  muted: { color: '#6b7280', fontSize: 12 },
  badge: { display: 'inline-block', borderRadius: 999, background: '#f3f4f6', color: '#374151', padding: '4px 8px', fontSize: 12, fontWeight: 'bold' },
}
