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
import { OptionDto } from '@/lib/option-types'

export interface ConfirmDeleteDialogProps {
  option: OptionDto | null
  onClose: () => void
  onDeleted: () => void
}

export function ConfirmDeleteDialog({ option, onClose, onDeleted }: ConfirmDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!option) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/options/${option.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error((err as { message?: string })?.message ?? `Erro ${res.status}`)
      }
      toast.success('Opção excluída')
      onDeleted()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir opção')
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!option} onOpenChange={(v) => !v && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir opção?</AlertDialogTitle>
          <AlertDialogDescription>
            A opção &ldquo;{option?.name}&rdquo; será removida. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
