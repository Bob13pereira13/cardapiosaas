'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getAdminToken, handleAdminUnauthorized } from '@/lib/auth'

type Client = {
  id: number
  nome: string
  email: string
  slug: string | null
  createdAt: string
  isActive: boolean
  plan: string
  subscriptionStatus: string
}

const PLAN_OPTIONS = ['FREE', 'STARTER', 'PRO', 'PREMIUM']
const SUBSCRIPTION_OPTIONS = ['TRIAL', 'ACTIVE', 'OVERDUE', 'CANCELED']

const SUBSCRIPTION_LABEL: Record<string, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Ativa',
  OVERDUE: 'Em atraso',
  CANCELED: 'Cancelada',
}

const SUBSCRIPTION_BADGE: Record<string, { background: string; color: string }> = {
  TRIAL: { background: '#fef3c7', color: '#92400e' },
  ACTIVE: { background: '#dcfce7', color: '#166534' },
  OVERDUE: { background: '#fee2e2', color: '#991b1b' },
  CANCELED: { background: '#f3f4f6', color: '#374151' },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR')
}

export default function AdminClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const loadClients = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClients()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadClients])

  async function toggleClient(client: Client) {
    const token = getAdminToken()
    if (!token) return

    try {
      setUpdatingId(client.id)
      const res = await fetch(`${API_URL}/admin/clientes/${client.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !client.isActive }),
      })
      if (handleAdminUnauthorized(res)) return
      if (!res.ok) throw new Error('Erro ao atualizar cliente')
      await loadClients()
    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar cliente.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function updateSubscription(
    client: Client,
    data: { plan?: string; subscriptionStatus?: string },
  ) {
    const token = getAdminToken()
    if (!token) return

    try {
      setUpdatingId(client.id)
      const res = await fetch(`${API_URL}/admin/clientes/${client.id}/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (handleAdminUnauthorized(res)) return
      if (!res.ok) throw new Error('Erro ao atualizar assinatura')
      const updated = await res.json()
      setClients((current) =>
        current.map((item) => (item.id === client.id ? updated : item)),
      )
    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar assinatura.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function createBillingSubscription(client: Client) {
    const token = getAdminToken()
    if (!token) return

    const cpfCnpj = window.prompt('CPF/CNPJ do cliente no Asaas')
    if (!cpfCnpj) return

    const valueInput = window.prompt('Valor mensal da assinatura', '99.90')
    if (!valueInput) return

    const value = Number(valueInput.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      alert('Valor invalido.')
      return
    }

    try {
      setUpdatingId(client.id)
      const res = await fetch(`${API_URL}/billing/subscription/${client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cpfCnpj,
          value,
          plan: client.plan,
          billingType: 'PIX',
        }),
      })
      if (handleAdminUnauthorized(res)) return
      if (!res.ok) throw new Error('Erro ao criar assinatura')
      await loadClients()
      alert('Assinatura criada no Asaas.')
    } catch (error) {
      console.error(error)
      alert('Erro ao criar assinatura no Asaas.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Clientes</h1>
          <p style={styles.subtitle}>Restaurantes cadastrados no SaaS</p>
        </div>
        <Link href="/admin/dashboard" style={styles.link}>
          Dashboard
        </Link>
      </header>

      <section style={styles.panel}>
        {loading ? (
          <p style={styles.empty}>Carregando clientes...</p>
        ) : clients.length === 0 ? (
          <p style={styles.empty}>Nenhum cliente cadastrado.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Slug</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Plano</th>
                  <th style={styles.th}>Assinatura</th>
                  <th style={styles.th}>Cadastro</th>
                  <th style={styles.th}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td style={styles.td}>{client.nome}</td>
                    <td style={styles.td}>{client.email}</td>
                    <td style={styles.td}>{client.slug || '-'}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background: client.isActive ? '#dcfce7' : '#fee2e2',
                          color: client.isActive ? '#166534' : '#991b1b',
                        }}
                      >
                        {client.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <select
                        value={client.plan}
                        disabled={updatingId === client.id}
                        onChange={(event) =>
                          updateSubscription(client, { plan: event.target.value })
                        }
                        style={styles.select}
                      >
                        {PLAN_OPTIONS.map((plan) => (
                          <option key={plan} value={plan}>
                            {plan}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.subscriptionCell}>
                        <span
                          style={{
                            ...styles.badge,
                            ...(SUBSCRIPTION_BADGE[client.subscriptionStatus] ??
                              SUBSCRIPTION_BADGE.TRIAL),
                          }}
                        >
                          {SUBSCRIPTION_LABEL[client.subscriptionStatus] ??
                            client.subscriptionStatus}
                        </span>
                        <select
                          value={client.subscriptionStatus}
                          disabled={updatingId === client.id}
                          onChange={(event) =>
                            updateSubscription(client, {
                              subscriptionStatus: event.target.value,
                            })
                          }
                          style={styles.select}
                        >
                          {SUBSCRIPTION_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {SUBSCRIPTION_LABEL[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={styles.td}>{formatDate(client.createdAt)}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        onClick={() => toggleClient(client)}
                        disabled={updatingId === client.id}
                        style={styles.button}
                      >
                        {client.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => createBillingSubscription(client)}
                        disabled={updatingId === client.id}
                        style={styles.primaryButton}
                      >
                        Criar assinatura
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  panel: { maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  empty: { margin: 0, color: '#6b7280' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb', padding: '10px 8px' },
  td: { color: '#111827', borderBottom: '1px solid #f3f4f6', padding: '12px 8px', whiteSpace: 'nowrap' },
  badge: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontWeight: 'bold', fontSize: 12 },
  button: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', marginRight: 8 },
  primaryButton: { border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontWeight: 'bold' },
  select: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '7px 9px', color: '#111827' },
  subscriptionCell: { display: 'flex', alignItems: 'center', gap: 8 },
}
