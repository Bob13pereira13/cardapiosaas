import Link from 'next/link'
import { Utensils } from 'lucide-react'

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-zinc-500">Última atualização: 6 de maio de 2026</p>
        <h1 className="mt-3 text-3xl font-bold text-zinc-950">Política de Cookies</h1>
        <div className="mt-8 space-y-6 rounded-lg border bg-white p-6 text-sm leading-7 text-zinc-600 shadow-sm">
          <p>Usamos cookies essenciais para manter login, segurança e preferências do painel.</p>
          <p>Também podemos usar cookies analíticos para entender uso do produto e melhorar a experiência.</p>
          <p>Você pode bloquear cookies no navegador, mas algumas funções do dashboard podem deixar de funcionar.</p>
          <p>Para dúvidas sobre privacidade, acesse nossa <Link className="font-medium text-brand-red" href="/privacidade">Política de Privacidade</Link>.</p>
        </div>
      </section>
    </main>
  )
}
