'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function SucessoPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const [bouncing, setBouncing] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setBouncing(false), 1000)
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle2 className={cn('mx-auto mb-5 h-16 w-16 text-green-500', bouncing && 'animate-bounce')} />
        <h1 className="mb-2 text-2xl font-bold text-green-700">Pedido confirmado!</h1>
        <p className="mb-1 text-sm text-zinc-500">Pedido #{orderId}</p>
        <p className="mb-8 text-sm text-zinc-500">Você receberá atualizações no WhatsApp</p>

        <div className="flex flex-col gap-3">
          <Button asChild className="bg-brand-red hover:bg-brand-red/90">
            <Link href={`/pedido/${orderId}/acompanhar`}>Acompanhar pedido</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={slug ? `/cardapio/${slug}` : '/'}>Fazer novo pedido</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
