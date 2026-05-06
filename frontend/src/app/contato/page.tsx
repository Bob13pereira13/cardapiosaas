'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Mail, MessageCircle, Utensils } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ContatoPage() {
  const [sending, setSending] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      toast.success('Mensagem enviada! Retornaremos em até 24h.')
    }, 500)
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <Toaster richColors position="top-right" />
      <header className="flex h-16 items-center justify-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-zinc-950">
          <Utensils className="h-5 w-5 text-brand-red" />
          cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
        </Link>
      </header>
      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950">Fale com a gente</h1>
          <p className="mt-2 text-sm text-zinc-500">Dúvidas comerciais, suporte e parcerias.</p>
          <div className="mt-6 space-y-3 text-sm text-zinc-700">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-red" /> suporte@cardapiopedeai.com.br</p>
            <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-brand-red" /> WhatsApp comercial</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input required />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea rows={5} required />
          </div>
          <Button disabled={sending} className="bg-brand-red hover:bg-brand-red/90">
            {sending ? 'Enviando...' : 'Enviar mensagem'}
          </Button>
        </form>
      </section>
    </main>
  )
}
