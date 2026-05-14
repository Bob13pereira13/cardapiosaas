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
}

const EMPTY_FORM: FormState = {
  name: '',
  codePdv: '',
  costPrice: '',
  description: '',
  useTechSheet: false,
  isActive: true,
}

export function OpcaoFormModal({ open, onClose, optionId, onSaved }: OpcaoFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const isEdit = typeof optionId === 'number'
  const title = isEdit ? 'Editar opção' : 'Criar opção'

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
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
        .then((data) => {
          setForm({
            name: data.name ?? '',
            codePdv: data.codePdv ?? '',
            costPrice: data.costPrice != null ? String(data.costPrice) : '',
            description: data.description ?? '',
            useTechSheet: data.useTechSheet ?? false,
            isActive: data.isActive ?? true,
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

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        useTechSheet: form.useTechSheet,
        isActive: form.isActive,
      }
      if (form.codePdv.trim()) body.codePdv = form.codePdv.trim()
      if (form.costPrice !== '') body.costPrice = parseFloat(form.costPrice)
      if (form.description.trim()) body.description = form.description.trim()

      const url = isEdit ? `${API_URL}/options/${optionId}` : `${API_URL}/options`
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error((err as { message?: string })?.message ?? `Erro ${res.status}`)
      }

      toast.success(isEdit ? 'Opção atualizada' : 'Opção criada')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar opção')
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v && !submitting) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
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
            {/* Image placeholder — integrado na 2B.4 */}
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
              <p className="text-center text-xs text-gray-400">
                Upload de imagem disponível em breve (Fase 2B.4)
              </p>
            </div>

            {/* Nome */}
            <div className="space-y-1">
              <Label htmlFor="opcao-name">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="opcao-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={
                  fieldErrors.name
                    ? 'border-red-400 focus-visible:ring-red-400'
                    : 'focus-visible:ring-brand-red'
                }
                disabled={submitting}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-500">{fieldErrors.name}</p>
              )}
            </div>

            {/* Código PDV */}
            <div className="space-y-1">
              <Label htmlFor="opcao-pdv">Código PDV</Label>
              <Input
                id="opcao-pdv"
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
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                className={
                  fieldErrors.costPrice
                    ? 'border-red-400 focus-visible:ring-red-400'
                    : 'focus-visible:ring-brand-red'
                }
                disabled={submitting}
              />
              {fieldErrors.costPrice && (
                <p className="text-xs text-red-500">{fieldErrors.costPrice}</p>
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
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="bg-brand-red hover:bg-brand-red/90"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
