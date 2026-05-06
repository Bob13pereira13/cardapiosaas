'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Utensils } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const FAQ = [
  {
    question: 'Como adiciono meus produtos?',
    answer: 'Acesse Dashboard → Produtos → Novo produto.',
  },
  {
    question: 'Como funciona o pagamento via PIX?',
    answer: 'O cliente escaneia o QR Code gerado automaticamente e a confirmação acontece online quando a integração está ativa.',
  },
  {
    question: 'Posso ter mais de um cardápio?',
    answer: 'No plano Pro você pode criar cardápios ilimitados.',
  },
  {
    question: 'Como cancelo minha assinatura?',
    answer: 'Acesse Dashboard → Assinatura → Cancelar plano.',
  },
  {
    question: 'Os dados dos meus clientes são seguros?',
    answer: 'Sim, seguimos a LGPD e boas práticas de segurança para proteger os dados cadastrados.',
  },
  {
    question: 'Como configuro meu domínio próprio?',
    answer: 'Disponível no plano Enterprise. Entre em contato com o suporte para configurar.',
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

export default function SuportePage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [assunto, setAssunto] = useState('duvida')
  const [mensagem, setMensagem] = useState('')
  const [sending, setSending] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      setNome('')
      setEmail('')
      setAssunto('duvida')
      setMensagem('')
      toast.success('Mensagem enviada! Retornaremos em até 24h.')
    }, 800)
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Toaster richColors position="top-right" />

      <header className="border-b bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-brand-red" />
          <span className="text-lg font-extrabold text-zinc-950">
            cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-zinc-950">Central de Suporte</h1>
        <p className="mb-10 text-sm text-zinc-500">Tire suas dúvidas ou entre em contato com nossa equipe.</p>

        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Perguntas Frequentes</h2>
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="px-5">
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
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Fale Conosco</h2>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <select
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="duvida">Dúvida técnica</option>
                  <option value="cobranca">Cobrança</option>
                  <option value="sugestao">Sugestão</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <Textarea
                  rows={4}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-500 underline hover:text-zinc-900"
                >
                  Preferir WhatsApp?
                </a>
                <Button type="submit" disabled={sending} className="bg-brand-red hover:bg-brand-red/90">
                  {sending ? 'Enviando...' : 'Enviar mensagem'}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white px-6 py-6 text-center text-sm text-zinc-500">
        <div className="flex justify-center gap-6">
          <Link href="/termos" className="hover:text-zinc-900">Termos</Link>
          <Link href="/privacidade" className="hover:text-zinc-900">Privacidade</Link>
        </div>
      </footer>
    </div>
  )
}
