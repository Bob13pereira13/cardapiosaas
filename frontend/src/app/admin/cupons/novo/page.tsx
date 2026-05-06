'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function AdminNovoCupomPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [value, setValue] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      toast.success('Cupom criado')
      router.push('/admin/cupons')
    }, 300)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Novo cupom admin</h1>
            <p className="text-sm text-zinc-500">Cupom comercial para assinatura do SaaS.</p>
          </div>
          <Button asChild variant="outline"><Link href="/admin/cupons">Voltar</Link></Button>
        </header>

        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label>Código</Label>
            <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="font-mono font-bold" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="PERCENT">Percentual</option>
                <option value="FIXED">Valor fixo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Validade</Label>
            <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-zinc-50 p-4">
            <Label>Ativo</Label>
            <button type="button" onClick={() => setActive((current) => !current)} className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition', active ? 'bg-zinc-950' : 'bg-zinc-200')}>
              <span className={cn('h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', active ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button disabled={saving} className="bg-zinc-950 text-white hover:bg-zinc-800">{saving ? 'Salvando...' : 'Criar cupom'}</Button>
          </div>
        </form>
      </div>
    </main>
  )
}
