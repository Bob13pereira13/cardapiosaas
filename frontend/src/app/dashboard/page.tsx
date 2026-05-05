'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type Category = {
  id: number
  nome: string
}

type Product = {
  id: number
  nome: string
  descricao?: string
  preco: number
  imagem?: string
  disponivel: boolean
  category?: Category
}

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED'

type DeliveryType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
type PaymentMethod =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'ONLINE_PIX'
  | 'ONLINE_CARD'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELED'
type Account = {
  id: number
  plan: string
  subscriptionStatus: SubscriptionStatus
  trialEndsAt?: string | null
}

type CustomerAddress = {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  zipcode?: string
}

type OrderItem = {
  id?: number
  productNameSnapshot: string
  quantity: number
  unitPrice?: number
  itemTotal: number
  itemNotes?: string
}

type Order = {
  id: number
  orderNumber: number
  customerName: string
  customerPhone?: string
  customerAddress?: CustomerAddress | null
  deliveryType?: DeliveryType
  orderStatus: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  subtotal?: number
  deliveryFee?: number
  discountAmount?: number
  total: number
  notes?: string
  createdAt: string
  items: OrderItem[]
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
}

const STATUS_BADGE: Record<OrderStatus, { background: string; color: string }> = {
  PENDING: { background: '#fef3c7', color: '#92400e' },
  CONFIRMED: { background: '#dbeafe', color: '#1d4ed8' },
  IN_PREPARATION: { background: '#dbeafe', color: '#1d4ed8' },
  READY: { background: '#dcfce7', color: '#166534' },
  OUT_FOR_DELIVERY: { background: '#cffafe', color: '#0e7490' },
  DELIVERED: { background: '#dcfce7', color: '#166534' },
  CANCELED: { background: '#fee2e2', color: '#b91c1c' },
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartao de credito',
  DEBIT_CARD: 'Cartao de debito',
  CASH: 'Dinheiro',
  ONLINE_PIX: 'PIX online',
  ONLINE_CARD: 'Cartao online',
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function isToday(date: string) {
  const current = new Date(date)
  const today = new Date()
  return current.toDateString() === today.toDateString()
}

function formatAddress(address?: CustomerAddress | null) {
  if (!address) return 'Nao informado'

  const line = [
    address.street,
    address.number,
    address.complement,
    address.neighborhood,
    address.city,
  ].filter(Boolean)

  return line.length > 0 ? line.join(', ') : 'Nao informado'
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [connected, setConnected] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [imagem, setImagem] = useState('')
  const [disponivel, setDisponivel] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  const [nomeCategoria, setNomeCategoria] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const LIMIT = 20

  const loadProducts = useCallback(async (p: number) => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }

    const res = await fetch(`${API_URL}/products?page=${p}&limit=${LIMIT}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (handleUnauthorized(res)) return

    const result = await res.json()
    setProducts(result.data)
    setTotalPages(result.totalPages)
    setTotalProducts(result.total)
    setPage(p)
  }, [])

  const loadCategories = useCallback(async () => {
    const token = getToken()
    if (!token) return

    const res = await fetch(`${API_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (handleUnauthorized(res)) return

    const data = await res.json()
    setCategories(data)
  }, [])

  const loadOrders = useCallback(async () => {
    const token = getToken()
    if (!token) return

    const res = await fetch(`${API_URL}/orders?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (handleUnauthorized(res)) return

    const data = await res.json()
    setOrders(data)
  }, [])

  const loadAccount = useCallback(async () => {
    const token = getToken()
    if (!token) return null

    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (handleUnauthorized(res)) return null

    const data = await res.json()
    setAccount(data)
    setSubscriptionStatus(data.subscriptionStatus)
    return data.subscriptionStatus as SubscriptionStatus
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const status = await loadAccount()
      if (status === 'OVERDUE' || status === 'CANCELED') {
        setLoading(false)
        return
      }
      await loadProducts(1)
      await loadCategories()
      await loadOrders()
      setLoading(false)
    }
    init()
  }, [loadAccount, loadCategories, loadOrders, loadProducts])

  useEffect(() => {
    const token = getToken()
    if (
      !token ||
      subscriptionStatus === 'OVERDUE' ||
      subscriptionStatus === 'CANCELED'
    ) return

    const socket = io(API_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('order:new', (order: Order) => {
      setOrders((prev) => {
        const exists = prev.some((current) => current.id === order.id)
        if (exists) {
          return prev.map((current) => (current.id === order.id ? order : current))
        }
        return [order, ...prev].slice(0, 50)
      })
    })

    socket.on(
      'order:status-changed',
      ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, orderStatus: status } : order,
          ),
        )
      },
    )

    socket.on('order:payment-confirmed', ({ orderId }: { orderId: number }) => {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, paymentStatus: 'PAID' } : order,
        ),
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [subscriptionStatus])

  async function handleUploadImagem(file: File) {
    try {
      setUploading(true)
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) throw new Error()
      const data = await res.json()
      setImagem(data.url)
    } catch {
      alert('Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    const token = getToken()
    if (!token) return alert('Você precisa estar logado.')
    if (!nome || !preco) return alert('Preencha nome e preço.')

    await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nome,
        descricao: descricao || undefined,
        preco: Number(preco),
        imagem: imagem || undefined,
        disponivel,
        categoryId: categoryId ? Number(categoryId) : undefined,
      }),
    })

    cancelarEdicao()
    await loadProducts(page)
  }

  async function handleUpdate() {
    const token = getToken()
    if (!token || !editId) return

    await fetch(`${API_URL}/products/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nome,
        descricao: descricao || undefined,
        preco: Number(preco),
        imagem: imagem || undefined,
        disponivel,
        categoryId: categoryId ? Number(categoryId) : undefined,
      }),
    })

    cancelarEdicao()
    await loadProducts(page)
  }

  async function toggleDisponivel(product: Product) {
    const token = getToken()
    if (!token) return

    await fetch(`${API_URL}/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ disponivel: !product.disponivel }),
    })

    await loadProducts(page)
  }

  async function handleDelete(id: number) {
    const token = getToken()
    if (!token) return
    if (!confirm('Excluir este produto?')) return

    await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await loadProducts(page)
  }

  async function handleCreateCategory() {
    const token = getToken()
    if (!token) return alert('Você precisa estar logado.')
    if (!nomeCategoria) return alert('Digite o nome da categoria.')

    await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome: nomeCategoria }),
    })

    setNomeCategoria('')
    await loadCategories()
  }

  async function handleUpdateCategory() {
    const token = getToken()
    if (!token || !editCategoryId) return
    if (!nomeCategoria) return alert('Digite o nome da categoria.')

    await fetch(`${API_URL}/categories/${editCategoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome: nomeCategoria }),
    })

    setEditCategoryId(null)
    setNomeCategoria('')
    await loadCategories()
    await loadProducts(page)
  }

  async function handleDeleteCategory(id: number) {
    const token = getToken()
    if (!token) return
    if (!confirm('Excluir esta categoria? Produtos vinculados ficam sem categoria.')) return

    await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await loadCategories()
    await loadProducts(page)
  }

  function cancelarEdicao() {
    setEditId(null)
    setNome('')
    setDescricao('')
    setPreco('')
    setImagem('')
    setDisponivel(true)
    setCategoryId('')
  }

  const todayOrders = orders.filter((order) => isToday(order.createdAt))
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
  const averageTicket =
    todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0
  const pendingOrders = orders.filter(
    (order) =>
      order.orderStatus === 'PENDING' || order.orderStatus === 'CONFIRMED',
  ).length
  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const dayOrders = orders.filter(
      (order) =>
        new Date(order.createdAt).toDateString() === date.toDateString(),
    )

    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      revenue: dayOrders.reduce((sum, order) => sum + order.total, 0),
    }
  })
  const recentOrders = orders.slice(0, 5)
  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId) ?? null
    : null
  const popularProducts = Object.values(
    orders.reduce<Record<string, { name: string; quantity: number; total: number }>>(
      (acc, order) => {
        for (const item of order.items) {
          const current = acc[item.productNameSnapshot] ?? {
            name: item.productNameSnapshot,
            quantity: 0,
            total: 0,
          }
          current.quantity += item.quantity
          current.total += item.itemTotal
          acc[item.productNameSnapshot] = current
        }
        return acc
      },
      {},
    ),
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4)
  const billingBlocked =
    subscriptionStatus === 'OVERDUE' || subscriptionStatus === 'CANCELED'
  const trialDaysLeft =
    account?.subscriptionStatus === 'TRIAL' && account.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(account.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <span style={styles.eyebrow}>Visao geral</span>
          <h1 style={styles.heroTitle}>Dashboard do restaurante</h1>
          <p style={styles.heroText}>
            Acompanhe vendas, pedidos e {totalProducts} produtos sem sair do painel.
          </p>
        </div>
        <div style={styles.heroActions}>
          <span style={styles.realtimeBadge}>
            <span
              style={{
                ...styles.realtimeDot,
                background: connected ? '#16a34a' : '#ef4444',
              }}
            />
            {connected ? 'Tempo real ativo' : 'Tempo real offline'}
          </span>
          <a href="/dashboard/pedidos" style={styles.heroButton}>
            Ver pedidos
          </a>
        </div>
      </section>

      {billingBlocked && (
        <section style={styles.billingAlert}>
          <strong>Sua assinatura está vencida</strong>
          <p>Regularize para continuar usando.</p>
          <a href="/dashboard/assinatura" style={styles.billingButton}>
            Regularizar pagamento
          </a>
        </section>
      )}

      {!billingBlocked && account && (
        <section style={styles.subscriptionNotice}>
          <div>
            <strong>Status da assinatura: {account.subscriptionStatus}</strong>
            {trialDaysLeft !== null && (
              <p>
                Seu trial termina em {trialDaysLeft} dia
                {trialDaysLeft === 1 ? '' : 's'}.
              </p>
            )}
          </div>
          <a href="/dashboard/assinatura" style={styles.billingButton}>
            Regularizar pagamento
          </a>
        </section>
      )}

      {!billingBlocked && (
        <>

      <div style={styles.cards}>
        <div style={styles.metricCard}>
          <span style={styles.metricIcon}>R$</span>
          <span style={styles.cardLabel}>Faturamento do dia</span>
          {loading ? (
            <span style={styles.skeletonValue} />
          ) : (
            <strong style={styles.cardValue}>{formatCurrency(todayRevenue)}</strong>
          )}
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricIcon}>#</span>
          <span style={styles.cardLabel}>Pedidos do dia</span>
          {loading ? (
            <span style={styles.skeletonValue} />
          ) : (
            <strong style={styles.cardValue}>{todayOrders.length}</strong>
          )}
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricIcon}>%</span>
          <span style={styles.cardLabel}>Ticket medio</span>
          {loading ? (
            <span style={styles.skeletonValue} />
          ) : (
            <strong style={styles.cardValue}>{formatCurrency(averageTicket)}</strong>
          )}
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricIcon}>!</span>
          <span style={styles.cardLabel}>Pedidos pendentes</span>
          {loading ? (
            <span style={styles.skeletonValue} />
          ) : (
            <strong style={styles.cardValue}>{pendingOrders}</strong>
          )}
        </div>
      </div>

      <section style={styles.insightsGrid}>
        <div style={styles.chartPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.panelTitle}>Faturamento</h2>
              <p style={styles.panelSubtitle}>Ultimos 7 dias</p>
            </div>
            <span style={styles.softBadge}>Receita</span>
          </div>
          <div style={styles.chartBox}>
            {loading ? (
              <div style={styles.chartSkeleton} />
            ) : orders.length === 0 ? (
              <div style={styles.emptyState}>
                <strong>Nenhum faturamento ainda</strong>
                <span>Quando os primeiros pedidos chegarem, o grafico aparece aqui.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#e5e7eb"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    width={42}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16a34a"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={styles.sidePanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.panelTitle}>Pedidos recentes</h2>
              <p style={styles.panelSubtitle}>Ultimas movimentacoes</p>
            </div>
          </div>
          <div style={styles.recentList}>
            {loading ? (
              <>
                <div style={styles.orderSkeleton} />
                <div style={styles.orderSkeleton} />
                <div style={styles.orderSkeleton} />
              </>
            ) : recentOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <strong>Nenhum pedido recente</strong>
                <span>Novos pedidos entram aqui automaticamente em tempo real.</span>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} style={styles.recentItem}>
                  <div>
                    <strong style={styles.recentTitle}>{order.customerName}</strong>
                    <p style={styles.recentMeta}>
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} - {formatCurrency(order.total)}
                    </p>
                    <span
                      style={{
                        ...styles.statusPill,
                        ...STATUS_BADGE[order.orderStatus],
                      }}
                    >
                      {STATUS_LABEL[order.orderStatus]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    style={styles.smallButton}
                  >
                    Ver
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section style={styles.popularPanel}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.panelTitle}>Produtos populares</h2>
            <p style={styles.panelSubtitle}>Mais vendidos nos pedidos carregados</p>
          </div>
        </div>
        <div style={styles.popularGrid}>
          {loading ? (
            <>
              <div style={styles.productSkeleton} />
              <div style={styles.productSkeleton} />
              <div style={styles.productSkeleton} />
              <div style={styles.productSkeleton} />
            </>
          ) : popularProducts.length === 0 ? (
            <div style={styles.emptyState}>
              <strong>Sem produtos populares ainda</strong>
              <span>Assim que houver vendas, os campeoes aparecem nesta area.</span>
            </div>
          ) : (
            popularProducts.map((item) => {
              const product = products.find((p) => p.nome === item.name)
              return (
                <div key={item.name} style={styles.popularCard}>
                  {product?.imagem ? (
                    <Image
                      src={product.imagem}
                      width={48}
                      height={48}
                      style={styles.popularImage}
                      alt={item.name}
                      unoptimized
                    />
                  ) : (
                    <div style={styles.popularFallback}>
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong style={styles.popularName}>{item.name}</strong>
                    <p style={styles.popularMeta}>
                      {item.quantity} vendido{item.quantity !== 1 ? 's' : ''} - {formatCurrency(product?.preco ?? item.total / item.quantity)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {selectedOrder && (
        <div style={styles.modalOverlay} onClick={() => setSelectedOrderId(null)}>
          <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.eyebrow}>Pedido #{selectedOrder.orderNumber}</span>
                <h2 style={styles.modalTitle}>{selectedOrder.customerName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                style={styles.closeButton}
              >
                Fechar
              </button>
            </div>

            <div style={styles.modalGrid}>
              <div style={styles.detailBox}>
                <span style={styles.detailLabel}>Status</span>
                <span
                  style={{
                    ...styles.statusPill,
                    ...STATUS_BADGE[selectedOrder.orderStatus],
                  }}
                >
                  {STATUS_LABEL[selectedOrder.orderStatus]}
                </span>
              </div>
              <div style={styles.detailBox}>
                <span style={styles.detailLabel}>Telefone</span>
                <strong style={styles.detailValue}>
                  {selectedOrder.customerPhone || 'Nao informado'}
                </strong>
              </div>
              <div style={styles.detailBox}>
                <span style={styles.detailLabel}>Pagamento</span>
                <strong style={styles.detailValue}>
                  {selectedOrder.paymentMethod
                    ? PAYMENT_LABEL[selectedOrder.paymentMethod]
                    : 'Nao informado'}
                </strong>
              </div>
              <div style={styles.detailBox}>
                <span style={styles.detailLabel}>Total</span>
                <strong style={styles.detailValue}>
                  {formatCurrency(selectedOrder.total)}
                </strong>
              </div>
            </div>

            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Itens</h3>
              <div style={styles.modalItems}>
                {selectedOrder.items.map((item, index) => (
                  <div key={item.id ?? `${item.productNameSnapshot}-${index}`} style={styles.modalItem}>
                    <div>
                      <strong style={styles.modalItemName}>
                        {item.quantity}x {item.productNameSnapshot}
                      </strong>
                      {item.itemNotes && (
                        <p style={styles.modalItemNotes}>{item.itemNotes}</p>
                      )}
                    </div>
                    <span style={styles.modalItemPrice}>
                      {formatCurrency(item.itemTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Entrega</h3>
              <p style={styles.modalText}>{formatAddress(selectedOrder.customerAddress)}</p>
            </div>

            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Observacoes</h3>
              <p style={styles.modalText}>
                {selectedOrder.notes || 'Nenhuma observacao informada.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de produto */}
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>
          {editId ? 'Editar produto' : 'Adicionar produto'}
        </h2>

        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Nome do produto *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Preço *"
            type="number"
            min="0"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />

          <select
            style={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>

          <textarea
            style={{ ...styles.input, gridColumn: '1 / -1', resize: 'vertical', minHeight: 72 }}
            placeholder="Descrição do produto (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={500}
          />
        </div>

        <div style={styles.uploadBox}>
          <div>
            <strong>Imagem do produto</strong>
            <p style={styles.uploadText}>Selecione do computador ou cole uma URL abaixo.</p>
            <input
              style={{ ...styles.input, marginTop: 8 }}
              placeholder="URL da imagem"
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              style={{ marginTop: 8 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImagem(f) }}
            />
            {uploading && <p style={styles.uploadText}>Enviando...</p>}
          </div>

          {imagem
            ? <Image src={imagem} width={120} height={120} style={styles.preview} alt="preview" unoptimized />
            : <div style={styles.previewFallback}>Preview</div>
          }
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={disponivel}
            onChange={(e) => setDisponivel(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Produto disponível (visível no cardápio)
        </label>

        <div style={styles.actions}>
          <button onClick={editId ? handleUpdate : handleCreate} style={styles.primaryButton}>
            {editId ? 'Salvar edição' : 'Criar produto'}
          </button>
          {editId && (
            <button onClick={cancelarEdicao} style={styles.secondaryButton}>
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* Lista de produtos */}
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Produtos cadastrados</h2>

        {loading && <p style={styles.empty}>Carregando...</p>}
        {!loading && products.length === 0 && (
          <p style={styles.empty}>Nenhum produto cadastrado ainda.</p>
        )}

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={{ ...styles.pageButton, opacity: page <= 1 ? 0.4 : 1 }}
              onClick={() => loadProducts(page - 1)}
              disabled={page <= 1}
            >
              ← Anterior
            </button>
            <span style={styles.pageInfo}>Página {page} de {totalPages}</span>
            <button
              style={{ ...styles.pageButton, opacity: page >= totalPages ? 0.4 : 1 }}
              onClick={() => loadProducts(page + 1)}
              disabled={page >= totalPages}
            >
              Próxima →
            </button>
          </div>
        )}

        <div style={styles.productList}>
          {products.map((product) => (
            <div
              key={product.id}
              style={{ ...styles.productItem, opacity: product.disponivel ? 1 : 0.55 }}
            >
              <div style={styles.productInfo}>
                {product.imagem
                  ? <Image src={product.imagem} width={64} height={64} style={styles.thumb} alt={product.nome} unoptimized />
                  : <div style={styles.thumbFallback}>{product.nome.charAt(0).toUpperCase()}</div>
                }
                <div>
                  <strong style={styles.productName}>{product.nome}</strong>
                  {product.descricao && (
                    <p style={styles.productMeta}>{product.descricao}</p>
                  )}
                  <p style={styles.productMeta}>
                    {product.category?.nome || 'Sem categoria'}
                    {' · '}
                    <span style={{ color: product.disponivel ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                      {product.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </p>
                </div>
              </div>

              <div style={styles.productRight}>
                <strong style={styles.price}>
                  R$ {product.preco.toFixed(2).replace('.', ',')}
                </strong>

                <button
                  style={{ ...styles.toggleButton, background: product.disponivel ? '#f3f4f6' : '#dcfce7', color: product.disponivel ? '#6b7280' : '#166534' }}
                  onClick={() => toggleDisponivel(product)}
                  title={product.disponivel ? 'Marcar como indisponível' : 'Marcar como disponível'}
                >
                  {product.disponivel ? 'Pausar' : 'Ativar'}
                </button>

                <button
                  style={styles.editButton}
                  onClick={() => {
                    setEditId(product.id)
                    setNome(product.nome)
                    setDescricao(product.descricao || '')
                    setPreco(product.preco.toString())
                    setImagem(product.imagem || '')
                    setDisponivel(product.disponivel)
                    setCategoryId(product.category?.id?.toString() || '')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Editar
                </button>

                <button style={styles.deleteButton} onClick={() => handleDelete(product.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>
          {editCategoryId ? 'Editar categoria' : 'Categorias'}
        </h2>

        <div style={styles.categoryForm}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Nome da categoria"
            value={nomeCategoria}
            onChange={(e) => setNomeCategoria(e.target.value)}
          />
          <button
            onClick={editCategoryId ? handleUpdateCategory : handleCreateCategory}
            style={styles.primaryButton}
          >
            {editCategoryId ? 'Salvar' : 'Criar categoria'}
          </button>
          {editCategoryId && (
            <button onClick={() => { setEditCategoryId(null); setNomeCategoria('') }} style={styles.secondaryButton}>
              Cancelar
            </button>
          )}
        </div>

        <div style={styles.productList}>
          {categories.map((cat) => (
            <div key={cat.id} style={styles.productItem}>
              <strong style={styles.productName}>{cat.nome}</strong>
              <div style={styles.productRight}>
                <button style={styles.editButton} onClick={() => { setEditCategoryId(cat.id); setNomeCategoria(cat.nome) }}>
                  Editar
                </button>
                <button style={styles.deleteButton} onClick={() => handleDeleteCategory(cat.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    maxWidth: 1180,
    margin: '0 auto',
    padding: '24px 16px 40px',
    background: '#f6f7fb',
  },
  hero: {
    background: '#ffffff',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  eyebrow: {
    display: 'inline-block',
    color: '#16a34a',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroTitle: {
    margin: 0,
    color: '#111827',
    fontSize: 30,
    lineHeight: 1.2,
  },
  heroText: {
    margin: '8px 0 0',
    color: '#6b7280',
    fontSize: 15,
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  realtimeBadge: {
    background: '#f9fafb',
    border: '1px solid #eef2f7',
    borderRadius: 999,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 'bold',
    padding: '9px 12px',
    whiteSpace: 'nowrap',
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  billingAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 18,
    padding: 22,
    color: '#991b1b',
    boxShadow: '0 12px 28px rgba(153,27,27,0.08)',
  },
  subscriptionNotice: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 18,
    padding: 18,
    color: '#111827',
    boxShadow: '0 12px 28px rgba(15,23,42,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  billingButton: {
    background: '#16a34a',
    color: '#fff',
    borderRadius: 12,
    padding: '10px 14px',
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'inline-block',
    marginTop: 8,
  },
  heroButton: {
    background: '#111827',
    color: '#fff',
    borderRadius: 12,
    padding: '12px 18px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'transform 160ms ease, box-shadow 160ms ease',
    boxShadow: '0 12px 24px rgba(17,24,39,0.18)',
    whiteSpace: 'nowrap',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 16,
  },
  metricCard: {
    background: '#fff',
    borderRadius: 18,
    padding: 22,
    boxShadow: '0 14px 34px rgba(15,23,42,0.07)',
    border: '1px solid #eef2f7',
    position: 'relative',
    overflow: 'hidden',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: '#ecfdf5',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardLabel: {
    display: 'block',
    color: '#6b7280',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardValue: {
    display: 'block',
    marginTop: 8,
    fontSize: 28,
    color: '#111827',
    lineHeight: 1.1,
  },
  skeletonValue: {
    display: 'block',
    width: '70%',
    height: 32,
    marginTop: 10,
    borderRadius: 10,
    background: 'linear-gradient(90deg, #eef2f7 0%, #f8fafc 50%, #eef2f7 100%)',
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)',
    gap: 18,
  },
  chartPanel: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 14px 34px rgba(15,23,42,0.07)',
    border: '1px solid #eef2f7',
  },
  sidePanel: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 14px 34px rgba(15,23,42,0.07)',
    border: '1px solid #eef2f7',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 18,
  },
  panelSubtitle: {
    margin: '4px 0 0',
    color: '#9ca3af',
    fontSize: 13,
  },
  softBadge: {
    background: '#ecfdf5',
    color: '#166534',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chartBox: {
    height: 280,
  },
  chartSkeleton: {
    height: '100%',
    borderRadius: 16,
    background:
      'linear-gradient(135deg, #f3f4f6 0%, #ffffff 45%, #eef2f7 100%)',
    border: '1px solid #eef2f7',
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  recentItem: {
    background: '#f9fafb',
    border: '1px solid #eef2f7',
    borderRadius: 14,
    padding: 14,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  recentTitle: {
    color: '#111827',
    fontSize: 14,
  },
  recentMeta: {
    margin: '4px 0 8px',
    color: '#6b7280',
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: 'bold',
  },
  smallButton: {
    background: '#fff',
    border: '1px solid #d1d5db',
    color: '#111827',
    borderRadius: 10,
    padding: '8px 11px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 160ms ease, border-color 160ms ease',
  },
  orderSkeleton: {
    height: 76,
    borderRadius: 14,
    background: 'linear-gradient(90deg, #f3f4f6 0%, #ffffff 50%, #f3f4f6 100%)',
    border: '1px solid #eef2f7',
  },
  popularPanel: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 14px 34px rgba(15,23,42,0.07)',
    border: '1px solid #eef2f7',
  },
  popularGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  popularCard: {
    background: '#f9fafb',
    border: '1px solid #eef2f7',
    borderRadius: 14,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  productSkeleton: {
    height: 74,
    borderRadius: 14,
    background: 'linear-gradient(90deg, #f3f4f6 0%, #ffffff 50%, #f3f4f6 100%)',
    border: '1px solid #eef2f7',
  },
  popularImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    objectFit: 'cover',
  },
  popularFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: '#dcfce7',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  popularName: {
    display: 'block',
    color: '#111827',
    fontSize: 14,
  },
  popularMeta: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  emptyCompact: {
    margin: 0,
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyState: {
    minHeight: 120,
    borderRadius: 16,
    background: '#f9fafb',
    border: '1px dashed #d1d5db',
    color: '#6b7280',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 18,
    textAlign: 'center',
    gridColumn: '1 / -1',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 50,
  },
  modal: {
    width: 'min(680px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 24px 80px rgba(15,23,42,0.28)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: {
    margin: 0,
    color: '#111827',
    fontSize: 24,
  },
  closeButton: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    borderRadius: 999,
    padding: '8px 12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
    marginBottom: 18,
  },
  detailBox: {
    background: '#f9fafb',
    border: '1px solid #eef2f7',
    borderRadius: 14,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  detailLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#111827',
    fontSize: 14,
  },
  modalSection: {
    borderTop: '1px solid #eef2f7',
    paddingTop: 14,
    marginTop: 14,
  },
  modalSectionTitle: {
    margin: '0 0 10px',
    color: '#111827',
    fontSize: 15,
  },
  modalItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  modalItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    background: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  modalItemName: {
    color: '#111827',
    fontSize: 14,
  },
  modalItemNotes: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  modalItemPrice: {
    color: '#111827',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  modalText: {
    margin: 0,
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.5,
  },
  panel: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
    marginBottom: 24,
  },
  panelTitle: {
    margin: '0 0 18px',
    fontSize: 20,
    color: '#111827',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  uploadBox: {
    marginTop: 16,
    background: '#f9fafb',
    border: '1px dashed #cbd5e1',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  uploadText: {
    margin: '6px 0',
    color: '#6b7280',
    fontSize: 13,
  },
  preview: {
    width: 110,
    height: 85,
    borderRadius: 12,
    objectFit: 'cover',
    flexShrink: 0,
  },
  previewFallback: {
    width: 110,
    height: 85,
    borderRadius: 12,
    background: '#e5e7eb',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    flexShrink: 0,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 16,
    fontSize: 14,
    color: '#374151',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    border: 0,
    background: '#16a34a',
    color: '#fff',
    padding: '11px 20px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    padding: '11px 20px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '20px 0',
    fontSize: 14,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    margin: '12px 0',
  },
  pageButton: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#111827',
    padding: '7px 14px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  pageInfo: {
    color: '#6b7280',
    fontSize: 13,
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  productItem: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    objectFit: 'cover',
    flexShrink: 0,
  },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 10,
    background: '#dcfce7',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    flexShrink: 0,
  },
  productName: {
    fontSize: 15,
    color: '#111827',
    display: 'block',
  },
  productMeta: {
    margin: '3px 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  productRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  price: {
    color: '#111827',
    fontSize: 15,
    marginRight: 4,
  },
  toggleButton: {
    border: 0,
    padding: '7px 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  editButton: {
    border: 0,
    background: '#2563eb',
    color: '#fff',
    padding: '7px 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deleteButton: {
    border: 0,
    background: '#ef4444',
    color: '#fff',
    padding: '7px 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  categoryForm: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
}
