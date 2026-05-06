'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { DeliveryType, PaymentMethod, ProductOption, formatCurrency } from '@/lib/order-types'

type ManualItem = {
  productId: string
  quantity: number
  itemNotes: string
}

const EMPTY_ITEM: ManualItem = { productId: '', quantity: 1, itemNotes: '' }

const DELIVERY_OPTIONS: Array<{ value: DeliveryType; label: string }> = [
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'PICKUP', label: 'Retirada' },
  { value: 'DINE_IN', label: 'Mesa' },
]

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartao de credito' },
  { value: 'DEBIT_CARD', label: 'Cartao de debito' },
]

export default function NovoPedidoPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [saving, setSaving] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('PICKUP')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [notes, setNotes] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [items, setItems] = useState<ManualItem[]>([{ ...EMPTY_ITEM }])

  useEffect(() => {
    async function loadProducts() {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_URL}/products?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(response)) return
      if (response.ok) {
        const data = (await response.json()) as { data?: ProductOption[] }
        setProducts((data.data ?? []).filter((product) => product.disponivel !== false))
      }
    }

    void loadProducts()
  }, [router])

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = products.find((option) => option.id === Number(item.productId))
        return sum + (product?.preco ?? 0) * item.quantity
      }, 0),
    [items, products],
  )

  function updateItem(index: number, patch: Partial<ManualItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    const validItems = items
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({
        productId: Number(item.productId),
        quantity: item.quantity,
        itemNotes: item.itemNotes || undefined,
      }))

    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item.')
      return
    }

    const body = {
      customerName,
      customerPhone,
      deliveryType,
      paymentMethod,
      notes: notes || undefined,
      customerAddress:
        deliveryType === 'DELIVERY'
          ? {
              street,
              number,
              neighborhood,
              city,
              zipcode,
            }
          : undefined,
      items: validItems,
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/orders/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error(error.message || 'Erro ao criar pedido.')
        return
      }

      const order = await response.json()
      toast.success('Pedido criado')
      router.push(`/dashboard/pedidos/${order.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Novo pedido manual"
        description="Pedidos / Novo pedido manual"
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/pedidos">Cancelar</Link>
          </Button>
        }
      />

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nome do cliente</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="11999999999"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  value={deliveryType}
                  onChange={(event) => setDeliveryType(event.target.value as DeliveryType)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DELIVERY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {deliveryType === 'DELIVERY' && (
              <div className="rounded-lg border bg-zinc-50 p-4">
                <h2 className="text-sm font-bold text-zinc-950">Endereco de entrega</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <InputField label="Rua" value={street} onChange={setStreet} required />
                  <InputField label="Numero" value={number} onChange={setNumber} required />
                  <InputField label="Bairro" value={neighborhood} onChange={setNeighborhood} required />
                  <InputField label="Cidade" value={city} onChange={setCity} required />
                  <InputField label="CEP" value={zipcode} onChange={setZipcode} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-zinc-950">Itens</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const product = products.find((option) => option.id === Number(item.productId))
                  return (
                    <div key={index} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_100px_1fr_auto]">
                      <div className="space-y-2">
                        <Label>Produto</Label>
                        <select
                          value={item.productId}
                          onChange={(event) => updateItem(index, { productId: event.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          required
                        >
                          <option value="">Selecione</option>
                          {products.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.nome} - {formatCurrency(option.preco)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Observacao</Label>
                        <Input
                          value={item.itemNotes}
                          onChange={(event) => updateItem(index, { itemNotes: event.target.value })}
                          placeholder="Sem cebola, ponto da carne..."
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="min-w-24 pb-2 text-right text-sm font-bold text-zinc-950">
                          {formatCurrency((product?.preco ?? 0) * item.quantity)}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={items.length === 1}
                          onClick={() => removeItem(index)}
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observacoes do pedido</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observacoes gerais do atendimento."
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Total calculado</p>
              <p className="text-2xl font-black text-zinc-950">{formatCurrency(total)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/pedidos')}>
                Cancelar
              </Button>
              <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
                {saving ? 'Criando...' : 'Criar pedido'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  )
}
