'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FAQ = [
  {
    question: 'Posso mudar de plano depois?',
    answer: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo de cobrança.',
  },
  {
    question: 'O plano Grátis tem limite de tempo?',
    answer: 'Não. O plano Grátis é permanente, sem trial. Você pode usar indefinidamente com as limitações do plano.',
  },
  {
    question: 'Quais formas de pagamento são aceitas para a assinatura?',
    answer: 'Aceitamos cartão de crédito e PIX. No plano anual, oferecemos boleto bancário.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Sem fidelidade. Cancele a qualquer momento pelo próprio painel. O acesso continua até o fim do período pago.',
  },
]

function FaqItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-zinc-200">
      <button
        type="button"
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-zinc-900"
        onClick={onToggle}
      >
        {question}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-zinc-600">{answer}</p>}
    </div>
  )
}

export default function PrecosPage() {
  const [annual, setAnnual] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const proPrice = annual ? Math.round(97 * 0.8) : 97

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
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-zinc-950">Planos simples e transparentes</h1>
          <p className="mb-8 text-zinc-500">Comece grátis. Cresça no seu ritmo.</p>

          <div className="inline-flex items-center gap-3 rounded-full border bg-white px-4 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition', !annual ? 'bg-zinc-950 text-white' : 'text-zinc-500')}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition', annual ? 'bg-zinc-950 text-white' : 'text-zinc-500')}
            >
              Anual
              <span className="ml-2 rounded-full bg-brand-yellow px-2 py-0.5 text-xs font-semibold text-zinc-950">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Grátis</p>
            <p className="mb-1 text-4xl font-bold text-zinc-950">R$ 0</p>
            <p className="mb-6 text-sm text-zinc-400">para sempre</p>
            <Button asChild className="mb-6 w-full" variant="outline">
              <Link href="/cadastro">Começar grátis</Link>
            </Button>
            <ul className="space-y-3 text-sm text-zinc-700">
              {['Até 20 produtos', '1 cardápio digital', 'QR Code gratuito', 'Pedidos via cardápio', 'Sem pagamentos online'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border-2 border-brand-red bg-white p-6 shadow-md">
            <div className="mb-4 inline-block rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
              Mais popular
            </div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Pro</p>
            <p className="mb-1 text-4xl font-bold text-zinc-950">R$ {proPrice}</p>
            <p className="mb-6 text-sm text-zinc-400">por mês{annual ? ', cobrado anualmente' : ''}</p>
            <Button asChild className="mb-6 w-full bg-brand-red hover:bg-brand-red/90">
              <Link href="/cadastro">Assinar Pro</Link>
            </Button>
            <ul className="space-y-3 text-sm text-zinc-700">
              {[
                'Produtos ilimitados',
                'Pagamentos PIX online',
                'Cupons de desconto',
                'Relatórios de vendas',
                'Suporte prioritário',
                'Domínio próprio',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-red" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Enterprise</p>
            <p className="mb-1 text-4xl font-bold text-zinc-950">Sob consulta</p>
            <p className="mb-6 text-sm text-zinc-400">para redes e franquias</p>
            <Button asChild className="mb-6 w-full" variant="outline">
              <Link href="/suporte">Falar com vendas</Link>
            </Button>
            <ul className="space-y-3 text-sm text-zinc-700">
              {[
                'Multi-unidades',
                'Domínio próprio',
                'Integração iFood',
                'SLA garantido',
                'Onboarding dedicado',
                'Contrato personalizado',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="mb-6 text-center text-xl font-semibold text-zinc-900">Perguntas frequentes</h2>
          <div className="mx-auto max-w-2xl rounded-lg border bg-white px-5 shadow-sm">
            {FAQ.map((item, index) => (
              <FaqItem
                key={index}
                question={item.question}
                answer={item.answer}
                open={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </section>
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
