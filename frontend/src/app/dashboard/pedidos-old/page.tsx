'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type DeliveryType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELED'
type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'ONLINE_PIX' | 'ONLINE_CARD'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

type OrderItem = {
  id: number
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  itemTotal: number
}

type Order = {
  id: number
  orderNumber: number
  customerName: string
  customerPhone: string
  deliveryType: DeliveryType
  orderStatus: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus?: PaymentStatus
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
  notes?: string
  couponCode?: string
  createdAt: string
  items: OrderItem[]
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu p/ entrega',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  IN_PREPARATION: '#8b5cf6',
  READY: '#16a34a',
  OUT_FOR_DELIVERY: '#0891b2',
  DELIVERED: '#6b7280',
  CANCELED: '#ef4444',
}

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  DELIVERY: 'Entrega',
  PICKUP: 'Retirada',
  DINE_IN: 'Mesa',
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  CASH: 'Dinheiro',
  ONLINE_PIX: 'PIX online',
  ONLINE_CARD: 'Cartão online',
}

function getNextActions(order: Order): { label: string; status: OrderStatus; danger?: boolean }[] {
  switch (order.orderStatus) {
    case 'PENDING':
      return [
        { label: 'Confirmar', status: 'CONFIRMED' },
        { label: 'Cancelar', status: 'CANCELED', danger: true },
      ]
    case 'CONFIRMED':
      return [
        { label: 'Iniciar preparo', status: 'IN_PREPARATION' },
        { label: 'Cancelar', status: 'CANCELED', danger: true },
      ]
    case 'IN_PREPARATION':
      return [
        { label: 'Marcar como pronto', status: 'READY' },
        { label: 'Cancelar', status: 'CANCELED', danger: true },
      ]
    case 'READY':
      if (order.deliveryType === 'DELIVERY') {
        return [
          { label: 'Saiu p/ entrega', status: 'OUT_FOR_DELIVERY' },
          { label: 'Cancelar', status: 'CANCELED', danger: true },
        ]
      }
      return [
        { label: 'Marcar como entregue', status: 'DELIVERED' },
        { label: 'Cancelar', status: 'CANCELED', danger: true },
      ]
    case 'OUT_FOR_DELIVERY':
      return [
        { label: 'Marcar como entregue', status: 'DELIVERED' },
        { label: 'Cancelar', status: 'CANCELED', danger: true },
      ]
    default:
      return []
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

const FILTER_TABS: Array<{ label: string; value: OrderStatus | 'ALL' }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Pendentes', value: 'PENDING' },
  { label: 'Confirmados', value: 'CONFIRMED' },
  { label: 'Em preparo', value: 'IN_PREPARATION' },
  { label: 'Prontos', value: 'READY' },
  { label: 'Em entrega', value: 'OUT_FOR_DELIVERY' },
  { label: 'Entregues', value: 'DELIVERED' },
  { label: 'Cancelados', value: 'CANCELED' },
]

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const loadOrders = useCallback(async (statusFilter: OrderStatus | 'ALL') => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }

    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter !== 'ALL') params.set('status', statusFilter)

    const res = await fetch(`${API_URL}/orders?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(res)) return

    const data: Order[] = await res.json()
    setOrders(data)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadOrders('ALL')
      setLoading(false)
    }
    init()
  }, [loadOrders])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const socket = io(API_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('order:new', (order: Order) => {
      setOrders((prev) => [order, ...prev])
      setNewIds((prev) => new Set(prev).add(order.id))
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev)
          next.delete(order.id)
          return next
        })
      }, 8000)
    })

    socket.on('order:status-changed', ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, orderStatus: status } : o))
      )
    })

    socket.on('order:payment-confirmed', ({ orderId }: { orderId: number }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'PAID' } : o))
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  async function handleFilterChange(value: OrderStatus | 'ALL') {
    setFilter(value)
    setLoading(true)
    await loadOrders(value)
    setLoading(false)
  }

  async function handleUpdateStatus(order: Order, newStatus: OrderStatus) {
    const token = getToken()
    if (!token) return

    setUpdatingId(order.id)
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: newStatus }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        const err = await res.json()
        alert(err.message || 'Erro ao atualizar status.')
        return
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus } : o))
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const displayed = filter === 'ALL'
    ? orders
    : orders.filter((o) => o.orderStatus === filter)

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pedidos</h1>
          <p style={styles.subtitle}>{orders.length} pedido{orders.length !== 1 ? 's' : ''} carregado{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={styles.wsIndicator}>
          <span style={{ ...styles.wsDot, background: connected ? '#16a34a' : '#ef4444' }} />
          <span style={styles.wsLabel}>{connected ? 'Tempo real ativo' : 'Desconectado'}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={styles.tabs}>
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'ALL'
            ? orders.length
            : orders.filter((o) => o.orderStatus === tab.value).length
          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              style={{
                ...styles.tab,
                ...(filter === tab.value ? styles.tabActive : {}),
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  ...styles.tabCount,
                  background: filter === tab.value ? '#16a34a' : '#e5e7eb',
                  color: filter === tab.value ? '#fff' : '#374151',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {loading ? (
        <p style={styles.empty}>Carregando pedidos...</p>
      ) : displayed.length === 0 ? (
        <p style={styles.empty}>Nenhum pedido encontrado.</p>
      ) : (
        <div style={styles.list}>
          {displayed.map((order) => {
            const isExpanded = expandedId === order.id
            const isNew = newIds.has(order.id)
            const actions = getNextActions(order)
            const isUpdating = updatingId === order.id

            return (
              <div
                key={order.id}
                style={{
                  ...styles.card,
                  ...(isNew ? styles.cardNew : {}),
                  borderLeft: `4px solid ${STATUS_COLOR[order.orderStatus]}`,
                }}
              >
                {/* Card header */}
                <div style={styles.cardHeader}>
                  <div style={styles.cardLeft}>
                    <span style={styles.orderNumber}>#{String(order.orderNumber).padStart(3, '0')}</span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: STATUS_COLOR[order.orderStatus] + '22',
                        color: STATUS_COLOR[order.orderStatus],
                      }}
                    >
                      {STATUS_LABEL[order.orderStatus]}
                    </span>
                    <span style={styles.deliveryBadge}>{DELIVERY_LABEL[order.deliveryType]}</span>
                    {isNew && <span style={styles.newBadge}>NOVO</span>}
                  </div>
                  <div style={styles.cardRight}>
                    <span style={styles.timeAgo}>{timeAgo(order.createdAt)}</span>
                    <strong style={styles.total}>R$ {order.total.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>

                {/* Customer + payment row */}
                <div style={styles.infoRow}>
                  <span style={styles.customerName}>{order.customerName}</span>
                  <span style={styles.infoSep}>·</span>
                  <span style={styles.infoMeta}>{order.customerPhone}</span>
                  <span style={styles.infoSep}>·</span>
                  <span style={styles.infoMeta}>{PAYMENT_LABEL[order.paymentMethod]}</span>
                  {order.couponCode && (
                    <>
                      <span style={styles.infoSep}>·</span>
                      <span style={{ ...styles.infoMeta, color: '#16a34a' }}>Cupom: {order.couponCode}</span>
                    </>
                  )}
                </div>

                {/* Items summary (collapsed) */}
                <div style={styles.itemsSummary}>
                  {order.items.slice(0, isExpanded ? order.items.length : 2).map((item) => (
                    <span key={item.id} style={styles.itemChip}>
                      {item.quantity}× {item.productNameSnapshot}
                    </span>
                  ))}
                  {!isExpanded && order.items.length > 2 && (
                    <span style={styles.itemChipMore}>+{order.items.length - 2} mais</span>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={styles.details}>
                    <table style={styles.table}>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td style={styles.tdQty}>{item.quantity}×</td>
                            <td style={styles.tdName}>{item.productNameSnapshot}</td>
                            <td style={styles.tdPrice}>R$ {item.itemTotal.toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={styles.totalsBlock}>
                      <div style={styles.totalRow}>
                        <span>Subtotal</span>
                        <span>R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {order.deliveryFee > 0 && (
                        <div style={styles.totalRow}>
                          <span>Taxa de entrega</span>
                          <span>R$ {order.deliveryFee.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      {order.discountAmount > 0 && (
                        <div style={{ ...styles.totalRow, color: '#16a34a' }}>
                          <span>Desconto</span>
                          <span>- R$ {order.discountAmount.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      <div style={{ ...styles.totalRow, fontWeight: 'bold', fontSize: 15 }}>
                        <span>Total</span>
                        <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    {order.notes && (
                      <p style={styles.notes}>
                        <strong>Observação:</strong> {order.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer: expand + actions */}
                <div style={styles.cardFooter}>
                  <button
                    style={styles.expandBtn}
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {isExpanded ? 'Menos detalhes ↑' : 'Ver detalhes ↓'}
                  </button>

                  <div style={styles.actionBtns}>
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order, action.status)}
                        style={{
                          ...styles.actionBtn,
                          background: action.danger ? '#fee2e2' : '#dcfce7',
                          color: action.danger ? '#ef4444' : '#166534',
                          opacity: isUpdating ? 0.6 : 1,
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isUpdating ? '...' : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
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
  wsIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    background: '#fff',
    borderRadius: 999,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  wsDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  wsLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    border: '1px solid #e5e7eb',
    background: '#fff',
    borderRadius: 999,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: '500',
    cursor: 'pointer',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  tabActive: {
    background: '#16a34a',
    borderColor: '#16a34a',
    color: '#fff',
  },
  tabCount: {
    borderRadius: 999,
    padding: '1px 7px',
    fontSize: 12,
    fontWeight: 'bold',
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: 15,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '16px 18px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s',
  },
  cardNew: {
    boxShadow: '0 0 0 2px #16a34a, 0 2px 12px rgba(22,163,74,0.15)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  orderNumber: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
  },
  statusBadge: {
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveryBadge: {
    background: '#f3f4f6',
    color: '#6b7280',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: '500',
  },
  newBadge: {
    background: '#16a34a',
    color: '#fff',
    borderRadius: 999,
    padding: '3px 9px',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timeAgo: {
    color: '#9ca3af',
    fontSize: 13,
  },
  total: {
    fontSize: 16,
    color: '#111827',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  customerName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  infoSep: {
    color: '#d1d5db',
    fontSize: 14,
  },
  infoMeta: {
    color: '#6b7280',
    fontSize: 13,
  },
  itemsSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  itemChip: {
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: 8,
    padding: '3px 10px',
    fontSize: 13,
  },
  itemChipMore: {
    background: '#e5e7eb',
    color: '#6b7280',
    borderRadius: 8,
    padding: '3px 10px',
    fontSize: 13,
    fontStyle: 'italic',
  },
  details: {
    borderTop: '1px solid #f3f4f6',
    paddingTop: 12,
    marginBottom: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 12,
  },
  tdQty: {
    width: 36,
    color: '#6b7280',
    fontSize: 13,
    paddingBottom: 4,
  },
  tdName: {
    color: '#111827',
    fontSize: 14,
    paddingBottom: 4,
  },
  tdPrice: {
    textAlign: 'right',
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
    paddingBottom: 4,
    whiteSpace: 'nowrap',
  },
  totalsBlock: {
    borderTop: '1px solid #f3f4f6',
    paddingTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#374151',
  },
  notes: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
    background: '#f9fafb',
    borderRadius: 8,
    padding: '8px 12px',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  expandBtn: {
    border: 0,
    background: 'transparent',
    color: '#6b7280',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
    fontWeight: '500',
  },
  actionBtns: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    border: 0,
    borderRadius: 999,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 'bold',
    transition: 'opacity 0.15s',
  },
}
