'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import { useUploadOptionImage } from '../hooks/useUploadOptionImage'
import { ImageUploader } from './ImageUploader'

export interface OpcaoFormModalProps {
  open: boolean
  onClose: () => void
  optionId: number | 'new' | null
  onSaved: () => void
}

interface FormState {
  name: string
  codePdv: string
  costPrice: string
  description: string
  useTechSheet: boolean
  isActive: boolean
  imageUrl: string | null
}

const EMPTY_FORM: FormState = {
  name: '',
  codePdv: '',
  costPrice: '',
  description: '',
  useTechSheet: false,
  isActive: true,
  imageUrl: null,
}

export function OpcaoFormModal({ open, onClose, optionId, onSaved }: OpcaoFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const uploadImage = useUploadOptionImage()
  const isEdit = typeof optionId === 'number'
  const title = isEdit ? 'Editar opção' : 'Criar opção'

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setPendingFile(null)
    setUploadProgress(0)

    if (optionId === 'new') {
      setForm(EMPTY_FORM)
      return
    }
    if (typeof optionId === 'number') {
      setLoading(true)
      fetch(`${API_URL}/options/${optionId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => r.json())
        .then((data: { name?: string; codePdv?: string; costPrice?: string | null; description?: string | null; useTechSheet?: boolean; isActive?: boolean; imageUrl?: string | null }) => {
          setForm({
            name: data.name ?? '',
            codePdv: data.codePdv ?? '',
            costPrice: data.costPrice != null ? String(data.costPrice) : '',
            description: data.description ?? '',
            useTechSheet: data.useTechSheet ?? false,
            isActive: data.isActive ?? true,
            imageUrl: data.imageUrl ?? null,
          })
        })
        .catch(() => toast.error('Erro ao carregar opção'))
        .finally(() => setLoading(false))
    }
  }, [open, optionId])

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errors.name = 'Nome obrigatório'
    else if (form.name.trim().length > 200) errors.name = 'Nome muito longo (máx. 200 caracteres)'
    if (form.costPrice !== '' && Number(form.costPrice) < 0)
      errors.costPrice = 'Preço não pode ser negativo'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function buildPayload() {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      useTechSheet: form.useTechSheet,
      isActive: form.isActive,
    }
    if (form.codePdv.trim()) body.codePdv = form.codePdv.trim()
    if (form.costPrice !== '') body.costPrice = parseFloat(form.costPrice)
    if (form.description.trim()) body.description = form.description.trim()
    return body
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      if (optionId === 'new') {
        // 1. Create option (without image)
        const res = await fetch(`${API_URL}/options`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload()),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null) as { message?: string } | null
          throw new Error(err?.message ?? `Erro ${res.status}`)
        }
        const savedOption = await res.json() as { id: number }

        // 2. Upload image if pending
        if (pendingFile) {
          setUploading(true)
          setUploadProgress(0)
          try {
            await uploadImage(savedOption.id, pendingFile, setUploadProgress)
          } catch (e) {
            toast.error(
              `Opção criada, mas falhou o upload da imagem: ${e instanceof Error ? e.message : 'Erro desconhecido'}`,
            )
          } finally {
            setUploading(false)
          }
        }
        toast.success('Opção criada')
      } else {
        // Edit mode
        // 1. Upload new image first (backend handles deleting old one)
        if (pendingFile) {
          setUploading(true)
          setUploadProgress(0)
          try {
            await uploadImage(optionId as number, pendingFile, setUploadProgress)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Falha no upload da imagem')
            setUploading(false)
            setSubmitting(false)
            return
          }
          setUploading(false)
        }
        // 2. Patch other fields
        const res = await fetch(`${API_URL}/options/${optionId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload()),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null) as { message?: string } | null
          throw new Error(err?.message ?? `Erro ${res.status}`)
        }
        toast.success('Opção atualizada')
      }

      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar opção')
    } finally {
      setSubmitting(false)
      setUploading(false)
      setPendingFile(null)
      setUploadProgress(0)
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v && !submitting && !uploading) onClose()
  }

  async function handleRemoveImage() {
    if (!optionId || optionId === 'new') {
      setPendingFile(null)
      return
    }
    const res = await fetch(`${API_URL}/options/${optionId}/image`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) {
      toast.error('Erro ao remover imagem')
      throw new Error('Erro ao remover imagem')
    }
    setForm((f) => ({ ...f, imageUrl: null }))
    toast.success('Imagem removida')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Image upload */}
            <ImageUploader
              value={form.imageUrl}
              pendingFile={pendingFile}
              onFileSelected={setPendingFile}
              onRemove={handleRemoveImage}
              disabled={submitting}
              uploading={uploading}
              progress={uploadProgress}
            />

            {/* Nome */}
            <div className="space-y-1">
              <Label htmlFor="opcao-name">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="opcao-name"
                autoFocus
                autoComplete="off"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                aria-describedby={fieldErrors.name ? 'opcao-name-error' : undefined}
                className={
                  fieldErrors.name
                    ? 'border-red-400 focus-visible:ring-red-400'
                    : 'focus-visible:ring-brand-red'
                }
                disabled={submitting}
              />
              {fieldErrors.name && (
                <p id="opcao-name-error" role="alert" className="text-xs text-red-500">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Código PDV */}
            <div className="space-y-1">
              <Label htmlFor="opcao-pdv">Código PDV</Label>
              <Input
                id="opcao-pdv"
                autoComplete="off"
                value={form.codePdv}
                onChange={(e) => setForm((f) => ({ ...f, codePdv: e.target.value }))}
                className="focus-visible:ring-brand-red"
                disabled={submitting}
              />
            </div>

            {/* Preço de custo */}
            <div className="space-y-1">
              <Label htmlFor="opcao-price">Preço de custo (R$)</Label>
              <Input
                id="opcao-price"
                type="number"
                step="0.01"
                min="0"
                autoComplete="off"
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                aria-describedby={fieldErrors.costPrice ? 'opcao-price-error' : undefined}
                className={
                  fieldErrors.costPrice
                    ? 'border-red-400 focus-visible:ring-red-400'
                    : 'focus-visible:ring-brand-red'
                }
                disabled={submitting}
              />
              {fieldErrors.costPrice && (
                <p id="opcao-price-error" role="alert" className="text-xs text-red-500">
                  {fieldErrors.costPrice}
                </p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="opcao-desc">Descrição</Label>
                <span className="text-xs text-gray-400">{form.description.length}/2000</span>
              </div>
              <Textarea
                id="opcao-desc"
                value={form.description}
                maxLength={2000}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="resize-none focus-visible:ring-brand-red"
                disabled={submitting}
              />
            </div>

            {/* Switch ficha técnica (disabled) */}
            <TooltipProvider>
              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-100 p-3">
                <Label className="cursor-default text-sm text-gray-400">
                  Calcular custo automaticamente pela ficha técnica
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Switch checked={false} disabled aria-label="Ficha técnica (em breve)" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-56 text-center text-xs">
                    Em breve — disponível ao integrar módulo de estoque
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Switch controle de estoque */}
            <div className="flex items-center justify-between gap-3 rounded-md border border-gray-100 p-3">
              <Label htmlFor="opcao-techsheet" className="cursor-pointer text-sm">
                Ativar controle de estoque
              </Label>
              <Switch
                id="opcao-techsheet"
                checked={form.useTechSheet}
                onCheckedChange={(v) => setForm((f) => ({ ...f, useTechSheet: v }))}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting || uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || loading}
            className="bg-brand-red hover:bg-brand-red/90"
          >
            {submitting || uploading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
