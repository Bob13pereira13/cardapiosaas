import type { OrderOrigin } from './order-origin'

export type DeliveryType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED'
export type PaymentMethod =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'ONLINE_PIX'
  | 'ONLINE_CARD'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export type OrderItem = {
  id: number
  productId?: number | null
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  itemTotal: number
  itemNotes?: string | null
}

export type OrderHistory = {
  id: number
  fromStatus?: OrderStatus | null
  toStatus: OrderStatus
  createdAt: string
}

export type Order = {
  id: number
  orderNumber: number
  customerName: string
  customerPhone: string
  customerAddress?: unknown
  deliveryType: DeliveryType
  orderStatus: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus?: PaymentStatus
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
  notes?: string | null
  couponCode?: string | null
  createdAt: string
  origin: OrderOrigin
  externalOrderId?: string | null
  externalChannel?: string | null
  items: OrderItem[]
  history?: OrderHistory[]
}

export type ProductOption = {
  id: number
  nome: string
  preco: number
  disponivel?: boolean
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu',
  DELIVERED: 'Concluido',
  CANCELED: 'Cancelado',
}

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  DELIVERY: 'Entrega',
  PICKUP: 'Retirada',
  DINE_IN: 'Mesa',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Credito',
  DEBIT_CARD: 'Debito',
  CASH: 'Dinheiro',
  ONLINE_PIX: 'PIX online',
  ONLINE_CARD: 'Cartao online',
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatOrderTime(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getNextStatuses(order: Order): OrderStatus[] {
  if (order.orderStatus === 'PENDING') return ['CONFIRMED', 'CANCELED']
  if (order.orderStatus === 'CONFIRMED') return ['IN_PREPARATION', 'CANCELED']
  if (order.orderStatus === 'IN_PREPARATION') return ['READY', 'CANCELED']
  if (order.orderStatus === 'READY') {
    return order.deliveryType === 'DELIVERY'
      ? ['OUT_FOR_DELIVERY', 'CANCELED']
      : ['DELIVERED', 'CANCELED']
  }
  if (order.orderStatus === 'OUT_FOR_DELIVERY') return ['DELIVERED', 'CANCELED']
  return []
}
