'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const TOGGLES = [
  ['pagamentoOnline', 'Permite pagamento online'],
  ['dominioProprio', 'Permite domínio próprio'],
  ['relatorios', 'Permite relatórios'],
  ['suportePrioritario', 'Suporte prioritário'],
] as const

export default function AdminNovoPlanoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState(true)
  const [features, setFeatures] = useState<Record<string, boolean>>({
    pagamentoOnline: true,
    dominioProprio: false,
    relatorios: true,
    suportePrioritario: false,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      toast.success('Plano criado')
      router.push('/admin/planos')
    }, 300)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Novo plano</h1>
            <p className="text-sm text-zinc-500">Crie um pacote comercial para restaurantes.</p>
          </div>
          <Button asChild variant="outline"><Link href="/admin/planos">Voltar</Link></Button>
        </header>

        <form onSubmit={submit} className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do plano"><Input required /></Field>
            <Field label="Limite de produtos (0 = ilimitado)"><Input type="number" min="0" defaultValue="0" required /></Field>
            <Field label="Preço mensal"><Input type="number" min="0" step="0.01" required /></Field>
            <Field label="Preço anual"><Input type="number" min="0" step="0.01" required /></Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TOGGLES.map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                active={features[key]}
                onClick={() => setFeatures((current) => ({ ...current, [key]: !current[key] }))}
              />
            ))}
          </div>

          <Field label="Recursos incluídos (um por linha)">
            <Textarea rows={6} defaultValue={'Produtos ilimitados\nPIX online\nRelatórios\nSuporte'} />
          </Field>

          <Toggle label="Ativo" active={active} onClick={() => setActive((value) => !value)} />

          <div className="flex justify-end border-t pt-5">
            <Button disabled={saving} className="bg-zinc-950 text-white hover:bg-zinc-800">{saving ? 'Salvando...' : 'Salvar plano'}</Button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-zinc-50 p-4">
      <p className="text-sm font-semibold text-zinc-950">{label}</p>
      <button type="button" onClick={onClick} className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition', active ? 'bg-zinc-950' : 'bg-zinc-200')}>
        <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', active ? 'translate-x-4' : 'translate-x-1')} />
      </button>
    </div>
  )
}
