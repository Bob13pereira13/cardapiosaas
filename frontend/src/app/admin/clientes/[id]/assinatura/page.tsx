'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Client = { id: number; nome: string; plan: string; subscriptionStatus: string; trialEndsAt?: string | null }

export default function AdminClienteAssinaturaPage() {
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
      <header style={styles.header}><div><h1 style={styles.title}>Assinatura</h1><p style={styles.subtitle}>{client?.nome ?? 'Cliente'}</p></div><Link style={styles.link} href={`/admin/clientes/${id}`}>Voltar</Link></header>
      <section style={styles.panel}>
        <p>Plano atual: <strong>{client?.plan ?? '-'}</strong></p>
        <p>Status: <strong>{client?.subscriptionStatus ?? '-'}</strong></p>
        <p>Trial até: <strong>{client?.trialEndsAt ? new Date(client.trialEndsAt).toLocaleDateString('pt-BR') : '-'}</strong></p>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 720, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  panel: { maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', color: '#111827' },
}
