'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'

const tickets = [
  { id: 1, client: 'Pizza do João', subject: 'Configurar Asaas', status: 'Aberto' },
  { id: 2, client: 'Hamburgueria Top', subject: 'Dúvida sobre domínio', status: 'Aguardando' },
]

export default function AdminSuportePage() {
  const [sending, setSending] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    window.setTimeout(() => { setSending(false); toast.success('Resposta registrada.') }, 400)
  }
  return (
    <main style={styles.page}>
      <Toaster richColors position="top-right" />
      <header style={styles.header}><div><h1 style={styles.title}>Suporte</h1><p style={styles.subtitle}>Atendimento interno aos restaurantes</p></div><Link style={styles.link} href="/admin/dashboard">Dashboard</Link></header>
      <section style={styles.grid}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Tickets</h2>
          {tickets.map((ticket) => <div key={ticket.id} style={styles.row}><strong>{ticket.client}</strong><span>{ticket.subject}</span><em>{ticket.status}</em></div>)}
        </div>
        <form onSubmit={submit} style={styles.panel}>
          <h2 style={styles.panelTitle}>Registrar contato</h2>
          <input style={styles.input} placeholder="Cliente" required />
          <textarea style={styles.textarea} rows={5} placeholder="Resumo do atendimento" required />
          <button style={styles.button} disabled={sending}>{sending ? 'Salvando...' : 'Salvar atendimento'}</button>
        </form>
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
  grid: { maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' },
  panel: { background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', display: 'grid', gap: 12 },
  panelTitle: { margin: 0, fontSize: 18, color: '#111827' },
  row: { display: 'grid', gap: 5, borderTop: '1px solid #f3f4f6', paddingTop: 12, color: '#111827' },
  input: { border: '1px solid #d1d5db', borderRadius: 8, padding: 12, fontSize: 14 },
  textarea: { border: '1px solid #d1d5db', borderRadius: 8, padding: 12, fontSize: 14 },
  button: { border: 0, background: '#111827', color: '#fff', borderRadius: 8, padding: 12, fontWeight: 'bold' },
}
