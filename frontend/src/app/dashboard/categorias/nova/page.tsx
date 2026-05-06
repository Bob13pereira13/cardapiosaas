'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function NovaCategoriaPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: nome.trim() }),
      })
      if (handleUnauthorized(res)) return
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        toast.error(err.message ?? 'Erro inesperado')
        return
      }
      toast.success('Categoria criada')
      router.push('/dashboard/categorias')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Nova categoria" description="Crie uma categoria para organizar seus produtos." />

      <div className="mx-auto max-w-lg rounded-lg border bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lanches, Bebidas..." required />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
              {saving ? 'Salvando...' : 'Criar categoria'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
