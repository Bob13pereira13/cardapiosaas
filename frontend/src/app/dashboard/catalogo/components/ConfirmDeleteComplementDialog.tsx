'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { ComplementDto } from '@/lib/complement-types'

export interface ConfirmDeleteComplementDialogProps {
  complement: ComplementDto | null
  onClose: () => void
  onDeleted: () => void
}

export function ConfirmDeleteComplementDialog({
  complement,
  onClose,
  onDeleted,
}: ConfirmDeleteComplementDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!complement) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/complements/${complement.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(err?.message ?? `Erro ${res.status}`)
      }
      toast.success('Complemento excluído')
      onDeleted()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir complemento')
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!complement} onOpenChange={(v) => !v && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir complemento?</AlertDialogTitle>
          <AlertDialogDescription>
            O complemento &ldquo;{complement?.name}&rdquo; será removido. Essa ação não pode ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} autoFocus>
            Cancelar
          </AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
