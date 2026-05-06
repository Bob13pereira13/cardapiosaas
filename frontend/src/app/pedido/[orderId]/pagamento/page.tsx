'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Utensils } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'

type PaymentStatus = {
  status?: string
  paymentStatus?: string
  total: number
  pixCopyPaste?: string
  pixQrCode?: string
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function PagamentoPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(15 * 60)
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus() {
    const res = await fetch(`${API_URL}/payments/order/${orderId}/status`)
    if (!res.ok) return
    const data = (await res.json()) as PaymentStatus
    setPayment(data)
    if ((data.status ?? data.paymentStatus) === 'PAID') {
      router.replace(`/pedido/${orderId}/sucesso`)
    }
  }

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false))

    pollRef.current = setInterval(() => { void fetchStatus() }, 5000)
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (pollRef.current) clearInterval(pollRef.current)
          if (countdownRef.current) clearInterval(countdownRef.current)
          router.push(`/pedido/${orderId}/erro?motivo=Tempo+expirado`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [orderId])

  function copyPix() {
    const pixKey = payment?.pixCopyPaste ?? `PIX-DEMO-PEDIDO-${orderId}`
    navigator.clipboard.writeText(pixKey).then(() => {
      setCopied(true)
      toast.success('Chave PIX copiada!')
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Toaster richColors position="top-right" />

      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 py-10">
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded bg-zinc-100" />
            <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h1 className="mb-1 text-xl font-bold text-zinc-950">Pague com PIX</h1>
            <p className="mb-6 text-3xl font-bold text-brand-red">{payment ? fmt(payment.total) : '—'}</p>

            <div className="mb-6 flex justify-center">
              <div className="grid h-[200px] w-[200px] grid-cols-10 gap-1 rounded-xl bg-zinc-100 p-4">
                {payment?.pixQrCode ? (
                  <img src={payment.pixQrCode} alt="QR Code PIX" className="col-span-10 h-full w-full rounded-xl object-contain" />
                ) : (
                  Array.from({ length: 100 }).map((_, index) => (
                    <span key={index} className={(index * 7 + index) % 3 === 0 ? 'rounded-sm bg-zinc-900' : 'rounded-sm bg-white'} />
                  ))
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-xs font-medium text-zinc-500">Chave PIX</p>
              <div className="flex items-center gap-2 rounded-lg border bg-zinc-50 p-3">
                <input
                  readOnly
                  value={payment?.pixCopyPaste ?? `PIX-DEMO-PEDIDO-${orderId}`}
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs text-zinc-700 outline-none"
                />
                <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1" onClick={copyPix}>
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="mb-6 text-center">
              <p className="text-xs text-zinc-400">Tempo restante</p>
              <p className={`text-2xl font-bold tabular-nums ${timeLeft < 60 ? 'text-red-600' : 'text-zinc-950'}`}>
                {formatCountdown(timeLeft)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-brand-red transition-all" style={{ width: `${(timeLeft / 900) * 100}%` }} />
              </div>
            </div>

            <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-600">
              <li>Abra o app do seu banco.</li>
              <li>Escolha pagar com PIX.</li>
              <li>Escaneie o QR Code ou cole a chave PIX.</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  )
}
