'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, MapPin, MessageCircle, Phone, ReceiptText, UserRound } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { OrderStatus, formatCurrency } from '@/lib/order-types'

type CustomerOrder = {
  id: number
  orderNumber: number
  total: number
  createdAt: string
  orderStatus: OrderStatus
  customerAddress?: {
    street?: string
    number?: string
    neighborhood?: string
    city?: string
  } | null
  items: Array<{
    id: number
    productNameSnapshot: string
    quantity: number
  }>
}

type CustomerHistory = {
  id: number
  name: string
  phone: string
  document?: string | null
  createdAt?: string
  ordersCount: number
  totalSpent: number
  orders: CustomerOrder[]
}

function formatDate(date?: string | null) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function summarizeItems(order: CustomerOrder) {
  return order.items
    .slice(0, 2)
    .map((item) => `${item.quantity}x ${item.productNameSnapshot}`)
    .join(', ')
}

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')

  const loadCustomer = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    const response = await fetch(`${API_URL}/customers/${id}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (handleUnauthorized(response)) return
    if (response.ok) {
      setCustomer((await response.json()) as CustomerHistory)
    } else {
      setCustomer(null)
    }
  }, [id, router])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadCustomer()
      setLoading(false)
    }

    void init()
  }, [loadCustomer])

  useEffect(() => {
    if (id) setNotes(localStorage.getItem(`customer-notes-${id}`) ?? '')
  }, [id])

  const stats = useMemo(() => {
    const orders = customer?.orders ?? []
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
    return {
      ordersCount: orders.length,
      totalSpent,
      averageTicket: orders.length ? totalSpent / orders.length : 0,
      lastOrderAt: orders[0]?.createdAt ?? null,
      firstOrderAt: orders[orders.length - 1]?.createdAt ?? null,
    }
  }, [customer])

  const addresses = useMemo(() => {
    const map = new Map<string, string>()
    for (const order of customer?.orders ?? []) {
      const address = order.customerAddress
      if (!address) continue
      const label = [address.street, address.number, address.neighborhood, address.city].filter(Boolean).join(', ')
      if (label) map.set(label, label)
    }
    return [...map.values()]
  }, [customer])

  function openWhatsApp() {
    const clean = customer?.phone.replace(/\D/g, '') ?? ''
    if (!clean) {
      toast.error('Cliente sem telefone válido.')
      return
    }
    window.open(`https://wa.me/55${clean}`, '_blank')
  }

  function saveNotes() {
    localStorage.setItem(`customer-notes-${id}`, notes)
    toast.success('Observações salvas')
  }

  if (loading) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  if (!customer) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Cliente nao encontrado"
          actions={
            <Button variant="outline" className="gap-2" onClick={() => router.push('/dashboard/clientes')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title={customer.name}
        description="Clientes / Perfil"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/clientes">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-brand-red" />
              Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Phone} label="Telefone" value={customer.phone} />
            <InfoRow label="CPF/CNPJ" value={customer.document ?? '-'} />
            <InfoRow icon={CalendarDays} label="Cadastro" value={formatDate(customer.createdAt)} />
            <InfoRow icon={ReceiptText} label="Ultimo pedido" value={formatDate(stats.lastOrderAt)} />
            <InfoRow icon={CalendarDays} label="Primeiro pedido" value={formatDate(stats.firstOrderAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              Estatisticas
              <Badge className="bg-brand-red text-white">
                {formatCurrency(stats.totalSpent)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total pedidos" value={String(stats.ordersCount)} />
            <StatCard label="Total gasto" value={formatCurrency(stats.totalSpent)} />
            <StatCard label="Ticket medio" value={formatCurrency(stats.averageTicket)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações internas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anote preferências, restrições ou informações úteis para atendimento." />
            <div className="flex justify-end">
              <Button className="bg-brand-red hover:bg-brand-red/90" onClick={saveNotes}>Salvar observações</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-brand-red" />
              Endereços usados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {addresses.length > 0 ? addresses.map((address) => (
              <div key={address} className="rounded-lg border bg-zinc-50 p-3 text-sm text-zinc-700">{address}</div>
            )) : (
              <p className="text-sm text-zinc-500">Nenhum endereço registrado nos pedidos.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/pedidos/${order.id}`)}
                >
                  <TableCell className="font-semibold">
                    #{String(order.orderNumber).padStart(3, '0')}
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell className="max-w-sm truncate">
                    {summarizeItems(order) || 'Sem itens'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.orderStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Phone
}) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 font-semibold text-zinc-950">{value}</p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-zinc-50 p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
    </div>
  )
}
