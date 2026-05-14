'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Trash2, Upload } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const HEIC_MIME = ['image/heic', 'image/heif']

export interface ImageUploaderProps {
  value: string | null
  pendingFile: File | null
  onFileSelected: (file: File | null) => void
  onRemove: () => Promise<void>
  disabled?: boolean
  uploading?: boolean
  progress?: number
}

export function ImageUploader({
  value,
  pendingFile,
  onFileSelected,
  onRemove,
  disabled,
  uploading,
  progress = 0,
}: ImageUploaderProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pendingFile) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(pendingFile)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  function validateAndSelect(file: File) {
    setLocalError(null)
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Imagem maior que 5 MB. Reduza o tamanho antes de enviar.')
      return
    }
    if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
      setLocalError('Use JPG, PNG, WEBP ou HEIC.')
      return
    }
    onFileSelected(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files[0]
    if (file) validateAndSelect(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
    e.target.value = ''
  }

  function openPicker() {
    if (disabled || uploading) return
    onFileSelected(null)
    setTimeout(() => inputRef.current?.click(), 0)
  }

  const isHeic = pendingFile ? HEIC_MIME.includes(pendingFile.type.toLowerCase()) : false
  const displaySrc = localPreview ?? value
  const hasContent = !!displaySrc

  return (
    <div className="space-y-1.5">
      <div
        role={!hasContent ? 'button' : undefined}
        tabIndex={!hasContent && !disabled && !uploading ? 0 : undefined}
        aria-label={!hasContent ? 'Arraste uma imagem ou clique para selecionar' : undefined}
        className={[
          'group relative h-44 w-full overflow-hidden rounded-lg border-2 transition-colors',
          hasContent
            ? 'border-transparent'
            : dragOver
              ? 'cursor-pointer border-brand-red bg-brand-red/5'
              : 'cursor-pointer border-dashed border-gray-300 bg-gray-50 hover:border-brand-red hover:bg-brand-red/5',
          disabled || uploading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true) }}
        onDragEnter={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !hasContent && !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!hasContent && !disabled && !uploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {/* Empty state */}
        {!hasContent && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <Upload className={`h-8 w-8 ${dragOver ? 'text-brand-red' : 'text-gray-300'}`} />
            <p className={`text-xs ${dragOver ? 'text-brand-red' : 'text-gray-400'}`}>
              {dragOver ? 'Solte aqui' : 'Arraste uma imagem ou clique'}
            </p>
          </div>
        )}

        {/* HEIC fallback (no native browser support) */}
        {hasContent && isHeic && (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-100 p-4 text-center">
            <ImageIcon className="h-10 w-10 text-gray-400" />
            <p className="max-w-full truncate text-xs text-gray-500">{pendingFile?.name}</p>
          </div>
        )}

        {/* Image preview */}
        {hasContent && !isHeic && displaySrc && (
          <img
            src={displaySrc}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
            <p className="text-sm font-semibold text-white">{progress}%</p>
            <div className="w-3/4">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {/* Hover action buttons (with saved image) */}
        {hasContent && !uploading && !disabled && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openPicker() }}
              className="rounded bg-white/90 p-1.5 shadow hover:bg-white"
              aria-label="Trocar imagem"
              title="Trocar"
            >
              <Upload className="h-3.5 w-3.5 text-gray-600" />
            </button>
            {value && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmRemove(true) }}
                className="rounded bg-white/90 p-1.5 shadow hover:bg-red-50"
                aria-label="Remover imagem"
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </button>
            )}
          </div>
        )}

        {/* Swap button (pending file, no saved image) */}
        {hasContent && !value && !uploading && !disabled && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openPicker() }}
              className="rounded bg-white/90 p-1.5 shadow hover:bg-white"
              aria-label="Trocar imagem"
              title="Trocar"
            >
              <Upload className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {localError && <p className="text-xs text-red-500">{localError}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
        aria-hidden
      />

      {/* Confirm remove AlertDialog */}
      <AlertDialog open={confirmRemove} onOpenChange={(v) => !removing && setConfirmRemove(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover imagem?</AlertDialogTitle>
            <AlertDialogDescription>
              A imagem será removida permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              className="bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.preventDefault()
                setRemoving(true)
                try {
                  await onRemove()
                } finally {
                  setRemoving(false)
                  setConfirmRemove(false)
                }
              }}
            >
              {removing ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
