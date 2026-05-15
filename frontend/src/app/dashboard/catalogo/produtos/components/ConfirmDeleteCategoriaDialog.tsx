'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { CategoryDto } from '@/lib/category-types'

interface Props {
  categoria: CategoryDto | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function ConfirmDeleteCategoriaDialog({ categoria, onClose, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } catch (e: unknown) {
      const msg = (e as Error).message ?? ''
      if (msg.includes('422') || msg.toLowerCase().includes('uso') || msg.toLowerCase().includes('vinculad')) {
        toast.error('Não é possível excluir: categoria possui produtos vinculados.')
      } else {
        toast.error(msg || 'Erro ao remover categoria')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={categoria !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
          <AlertDialogDescription>
            Excluir <strong>&quot;{categoria?.nome}&quot;</strong>? Os produtos vinculados ficarão sem categoria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} onClick={onClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={() => void handleConfirm()}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {deleting ? 'Excluindo…' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
