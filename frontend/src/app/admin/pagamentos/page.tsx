'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Payment = {
  id: number
  orderNumber: number
  total: number
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  user: { nome: string; email: string }
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminPagamentosPage() {
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = getAdminToken()
      if (!token) { window.location.href = '/admin/login'; return }
      const res = await fetch(`${API_URL}/admin/payments`, { headers: { Authorization: `Bearer ${token}` } })
      if (handleAdminUnauthorized(res)) return
      if (res.ok) setItems(await res.json())
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <main style={styles.page}>
      <Header title="Pagamentos" />
      <Panel>
        {loading ? <p style={styles.empty}>Carregando...</p> : (
          <table style={styles.table}>
            <thead><tr><Th>Pedido</Th><Th>Cliente</Th><Th>Método</Th><Th>Status</Th><Th>Total</Th><Th>Data</Th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}>
                <Td>#{item.orderNumber}</Td>
                <Td>{item.user.nome}</Td>
                <Td>{item.paymentMethod}</Td>
                <Td><Badge>{item.paymentStatus}</Badge></Td>
                <Td>{fmt(item.total)}</Td>
                <Td>{new Date(item.createdAt).toLocaleString('pt-BR')}</Td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Panel>
    </main>
  )
}

function Header({ title }: { title: string }) { return <header style={styles.header}><div><h1 style={styles.title}>{title}</h1><p style={styles.subtitle}>Pagamentos processados nos restaurantes</p></div><Link style={styles.link} href="/admin/dashboard">Dashboard</Link></header> }
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
  panel: { maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', overflowX: 'auto' },
  empty: { color: '#6b7280' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 8px', color: '#6b7280', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', whiteSpace: 'nowrap' },
  badge: { display: 'inline-block', borderRadius: 999, background: '#f3f4f6', color: '#374151', padding: '4px 8px', fontSize: 12, fontWeight: 'bold' },
}
