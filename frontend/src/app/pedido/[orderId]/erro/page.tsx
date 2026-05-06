'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErroPagamentoPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const motivo = searchParams.get('motivo') ?? 'Pagamento não processado'

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <XCircle className="mx-auto mb-5 h-16 w-16 text-red-500" />
        <h1 className="mb-5 text-2xl font-bold text-red-700">Pagamento não concluído</h1>
        <div className="mb-8 rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">{motivo}</div>

        <div className="flex flex-col gap-3">
          <Button asChild className="bg-brand-red hover:bg-brand-red/90">
            <Link href={`/pedido/${orderId}/pagamento`}>Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/suporte">Falar com suporte</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
