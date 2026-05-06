'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Dice5 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { cn } from '@/lib/utils'

type CouponType = 'PERCENT' | 'FIXED'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function randomCode() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SAVE${suffix}`
}

export default function NovoCupomPage() {
  const router = useRouter()
  const [code, setCode] = useState('SAVE10')
  const [type, setType] = useState<CouponType>('PERCENT')
  const [value, setValue] = useState('10')
  const [minOrderValue, setMinOrderValue] = useState('50')
  const [limiteUso, setLimiteUso] = useState('')
  const [limitePorCliente, setLimitePorCliente] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => {
    const amount = Number(value || 0)
    const minimum = Number(minOrderValue || 0)
    const discount = type === 'PERCENT' ? `${amount}% de desconto` : `${formatCurrency(amount)} de desconto`
    const rule = minimum > 0 ? ` em pedidos acima de ${formatCurrency(minimum)}` : ''
    return `${code || 'SAVE10'} - ${discount}${rule}`
  }, [code, minOrderValue, type, value])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: Number(value),
          minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
          maxUses: limiteUso ? Number(limiteUso) : undefined,
          limiteUso: limiteUso ? Number(limiteUso) : undefined,
          limitePorCliente: limitePorCliente ? Number(limitePorCliente) : undefined,
          validUntil: validUntil || undefined,
        }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string }
        toast.error(error.message || 'Erro ao criar cupom.')
        return
      }

      toast.success(active ? 'Cupom criado' : 'Cupom criado. Desative na lista se necessario.')
      router.push('/dashboard/cupons')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader
        title="Novo cupom"
        description="Cupons / Novo cupom"
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/cupons">Cancelar</Link>
          </Button>
        }
      />

      <form onSubmit={submit}>
        <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuracao do cupom</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="code">Codigo</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    className="font-mono font-bold"
                    required
                  />
                  <Button type="button" variant="outline" className="gap-2" onClick={() => setCode(randomCode())}>
                    <Dice5 className="h-4 w-4" />
                    Gerar aleatorio
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as CouponType)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="PERCENT">Percentual</option>
                  <option value="FIXED">Valor fixo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minOrderValue">Pedido minimo</Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderValue}
                  onChange={(event) => setMinOrderValue(event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Data de expiracao</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limiteUso">Limite de uso total</Label>
                <Input
                  id="limiteUso"
                  type="number"
                  min="0"
                  value={limiteUso}
                  onChange={(event) => setLimiteUso(event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitePorCliente">Limite por cliente</Label>
                <Input
                  id="limitePorCliente"
                  type="number"
                  min="0"
                  value={limitePorCliente}
                  onChange={(event) => setLimitePorCliente(event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-zinc-50 p-4 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setActive((current) => !current)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    active ? 'bg-brand-red' : 'bg-zinc-300',
                  )}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full bg-white shadow transition-transform',
                      active ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">Ativo</p>
                  <p className="text-xs text-zinc-500">Cupom disponivel para clientes apos a criacao.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t pt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/cupons')}>
                Cancelar
              </Button>
              <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
                {saving ? 'Criando...' : 'Criar cupom'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview ao vivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed bg-zinc-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-lg font-black text-zinc-950">{code || 'SAVE10'}</p>
                  <Badge className={active ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'}>
                    {active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{preview}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
