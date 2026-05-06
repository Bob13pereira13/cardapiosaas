'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, MessageCircle, Search } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'ONLINE_PIX' | 'ONLINE_CARD'
type DeliveryType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'

type Customer = {
  id: number
  name: string
  phone: string
  document?: string | null
  ordersCount: number
  totalSpent: number
  lastOrderAt?: string | null
  lastOrder?: {
    orderNumber: number
    createdAt: string
    total: number
  } | null
}

type OrderItem = {
  id: number
  productNameSnapshot: string
  quantity: number
  itemTotal: number
}

type CustomerOrder = {
  id: number
  orderNumber: number
  total: number
  subtotal: number
  deliveryFee: number
  discountAmount: number
  paymentMethod: PaymentMethod
  deliveryType: DeliveryType
  createdAt: string
  items: OrderItem[]
}

type CustomerHistory = Customer & {
  orders: CustomerOrder[]
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartao de credito',
  DEBIT_CARD: 'Cartao de debito',
  CASH: 'Dinheiro',
  ONLINE_PIX: 'PIX online',
  ONLINE_CARD: 'Cartao online',
}

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  DELIVERY: 'Entrega',
  PICKUP: 'Retirada',
  DINE_IN: 'Mesa',
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(date?: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleString('pt-BR')
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CustomerHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [search, setSearch] = useState('')

  const loadCustomers = useCallback(async () => {
    const token = getToken()
    if (!token) {
      window.location.href = '/login'
      return
    }

    const res = await fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(res)) return

    const data: Customer[] = await res.json()
    setCustomers(data)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadCustomers()
      setLoading(false)
    }
    init()
  }, [loadCustomers])

  async function openHistory(customerId: number) {
    const token = getToken()
    if (!token) return

    setLoadingHistory(true)
    try {
      const res = await fetch(`${API_URL}/customers/${customerId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        toast.error('Erro ao carregar histórico do cliente.')
        return
      }
      const data: CustomerHistory = await res.json()
      setSelected(data)
    } finally {
      setLoadingHistory(false)
    }
  }

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0)
  const totalOrders = customers.reduce((sum, customer) => sum + customer.ordersCount, 0)
  const filteredCustomers = customers.filter((customer) => {
    const term = search.toLowerCase()
    return customer.name.toLowerCase().includes(term) || customer.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  })

  async function exportCsv() {
    const token = getToken()
    if (!token) return
    const res = await fetch(`${API_URL}/customers/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(res)) return
    if (!res.ok) {
      toast.error('Erro ao exportar clientes.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function openWhatsApp(phone: string) {
    const clean = phone.replace(/\D/g, '')
    if (!clean) {
      toast.error('Cliente sem telefone válido.')
      return
    }
    window.open(`https://wa.me/55${clean}`, '_blank')
  }

  return (
    <div>
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Clientes"
        description={`${customers.length} cliente${customers.length !== 1 ? 's' : ''} cadastrado${customers.length !== 1 ? 's' : ''}`}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => void exportCsv()}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-5 mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-9"
          />
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total gasto</span>
          <strong style={styles.statValue}>{formatCurrency(totalRevenue)}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pedidos</span>
          <strong style={styles.statValue}>{totalOrders}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Clientes</span>
          <strong style={styles.statValue}>{customers.length}</strong>
        </div>
      </div>

      {loading ? (
        <p style={styles.empty}>Carregando clientes...</p>
      ) : filteredCustomers.length === 0 ? (
        <p style={styles.empty}>Nenhum cliente encontrado.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>CPF/CNPJ</th>
                <th style={styles.th}>Total gasto</th>
                <th style={styles.th}>Pedidos</th>
                <th style={styles.th}>Ultimo pedido</th>
                <th style={styles.th} />
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={styles.td}>
                    <strong style={styles.name}>{customer.name}</strong>
                  </td>
                  <td style={styles.td}>{customer.phone}</td>
                  <td style={styles.td}>{customer.document ?? '-'}</td>
                  <td style={styles.td}>{formatCurrency(customer.totalSpent)}</td>
                  <td style={styles.td}>{customer.ordersCount}</td>
                  <td style={styles.td}>{formatDate(customer.lastOrderAt)}</td>
                  <td style={styles.td}>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openWhatsApp(customer.phone)} className="gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                      <button
                        type="button"
                        onClick={() => openHistory(customer.id)}
                        disabled={loadingHistory}
                        style={styles.historyBtn}
                      >
                        Historico
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>{selected.name}</h2>
                <p style={styles.modalSubtitle}>
                  {selected.phone} · {selected.document ?? 'Sem CPF/CNPJ'}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={styles.closeBtn}>
                ×
              </button>
            </div>

            <div style={styles.modalStats}>
              <span>{selected.ordersCount} pedidos</span>
              <strong>{formatCurrency(selected.totalSpent)}</strong>
            </div>

            <div style={styles.ordersList}>
              {selected.orders.map((order) => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <strong>#{String(order.orderNumber).padStart(3, '0')}</strong>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div style={styles.orderMeta}>
                    <span>{DELIVERY_LABEL[order.deliveryType]}</span>
                    <span>{PAYMENT_LABEL[order.paymentMethod]}</span>
                    <strong>{formatCurrency(order.total)}</strong>
                  </div>
                  <div style={styles.items}>
                    {order.items.map((item) => (
                      <span key={item.id} style={styles.item}>
                        {item.quantity}x {item.productNameSnapshot}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  statLabel: {
    display: 'block',
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 6,
  },
  statValue: {
    color: '#111827',
    fontSize: 20,
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: 15,
  },
  tableWrap: {
    background: '#fff',
    borderRadius: 16,
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 780,
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'uppercase',
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '14px 16px',
    color: '#374151',
    fontSize: 14,
    borderBottom: '1px solid #f9fafb',
    whiteSpace: 'nowrap',
  },
  name: {
    color: '#111827',
  },
  historyBtn: {
    border: 0,
    background: '#dcfce7',
    color: '#166534',
    borderRadius: 999,
    padding: '8px 14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 18,
    width: '100%',
    maxWidth: 720,
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: 20,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    color: '#111827',
    fontSize: 22,
  },
  modalSubtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 0,
    background: '#f3f4f6',
    cursor: 'pointer',
    fontSize: 22,
    color: '#6b7280',
  },
  modalStats: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    color: '#374151',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  orderCard: {
    border: '1px solid #f3f4f6',
    borderRadius: 14,
    padding: 14,
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#111827',
    marginBottom: 8,
  },
  orderMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 10,
  },
  items: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  item: {
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: 8,
    padding: '4px 8px',
    fontSize: 13,
  },
}
