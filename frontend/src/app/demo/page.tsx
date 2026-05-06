'use client'

import Link from 'next/link'
import { Bell, QrCode, Utensils, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: QrCode, title: 'QR Code instantâneo', desc: 'Gere seu QR e coloque na mesa em segundos.' },
  { icon: Bell, title: 'Pedidos em tempo real', desc: 'Notificação sonora a cada novo pedido.' },
  { icon: Zap, title: 'PIX integrado', desc: 'Pagamento confirmado automaticamente.' },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-brand-red" />
            <span className="text-lg font-extrabold text-zinc-950">
              cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
            </span>
          </Link>
          <Button asChild size="sm" className="bg-brand-red hover:bg-brand-red/90">
            <Link href="/cadastro">Criar meu cardápio grátis</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-zinc-950">Veja o cardápio digital em ação</h1>
          <p className="mb-8 text-zinc-500">Explore o cardápio demo e veja como seus clientes vão fazer pedidos.</p>
          <Button className="bg-brand-red hover:bg-brand-red/90" onClick={() => window.open('/cardapio/demo', '_blank')}>
            Abrir cardápio demo
          </Button>
        </div>

        <div className="mb-16 overflow-hidden rounded-lg border bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b bg-zinc-50 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-zinc-400">cardapiopedeai.com.br/cardapio/demo</span>
          </div>
          <iframe src="/cardapio/demo" className="h-[600px] w-full" title="Demo do cardápio digital" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-red-soft">
                <Icon className="h-6 w-6 text-brand-red" />
              </div>
              <h3 className="mb-2 font-semibold text-zinc-900">{title}</h3>
              <p className="text-sm text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t bg-white px-6 py-6 text-center text-sm text-zinc-500">
        <div className="flex justify-center gap-6">
          <Link href="/termos" className="hover:text-zinc-900">Termos</Link>
          <Link href="/privacidade" className="hover:text-zinc-900">Privacidade</Link>
          <Link href="/suporte" className="hover:text-zinc-900">Suporte</Link>
        </div>
      </footer>
    </div>
  )
}
