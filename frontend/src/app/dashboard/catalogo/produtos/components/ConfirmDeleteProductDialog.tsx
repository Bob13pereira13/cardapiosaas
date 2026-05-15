'use client'

import { useState } from 'react'
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
import type { ProductDto } from '@/lib/product-types'

interface Props {
  produto: ProductDto | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function ConfirmDeleteProductDialog({ produto, onClose, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={produto !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
          <AlertDialogDescription>
            Excluir <strong>&quot;{produto?.nome}&quot;</strong>? Pedidos antigos serão preservados (snapshots).
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
