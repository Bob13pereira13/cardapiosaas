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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import {
  type ComplementDto,
  type ComplementLink,
  type ComplementSelectionRule,
  LINK_LABELS,
  SELECTION_RULE_LABELS,
} from '@/lib/complement-types'

export interface ComplementoFormModalProps {
  open: boolean
  onClose: () => void
  complementId: number | 'new' | null
  onSaved: () => void
}

const ALL_LINKS: ComplementLink[] = ['DELIVERY', 'BALCAO', 'MESA_PUBLIC', 'MESA_INTERNAL', 'PREVIEW']
const ALL_RULES: ComplementSelectionRule[] = ['SINGLE', 'MULTI_NO_REPEAT', 'MULTI_REPEAT']

interface FormErrors {
  name?: string
  availableLinks?: string
  range?: string
}

const EMPTY_FORM = {
  name: '',
  description: '',
  selectionRule: 'SINGLE' as ComplementSelectionRule,
  availableLinks: [] as ComplementLink[],
  minSelections: 0,
  maxSelections: 1,
}

export function ComplementoFormModal({
  open,
  onClose,
  complementId,
  onSaved,
}: ComplementoFormModalProps) {
  const [name, setName] = useState(EMPTY_FORM.name)
  const [description, setDescription] = useState(EMPTY_FORM.description)
  const [selectionRule, setSelectionRule] = useState<ComplementSelectionRule>(EMPTY_FORM.selectionRule)
  const [availableLinks, setAvailableLinks] = useState<ComplementLink[]>(EMPTY_FORM.availableLinks)
  const [minSelections, setMinSelections] = useState(EMPTY_FORM.minSelections)
  const [maxSelections, setMaxSelections] = useState(EMPTY_FORM.maxSelections)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const isEdit = typeof complementId === 'number'
  const isRequired = minSelections > 0

  useEffect(() => {
    if (!open) return
    setErrors({})

    if (complementId === 'new') {
      setName(EMPTY_FORM.name)
      setDescription(EMPTY_FORM.description)
      setSelectionRule(EMPTY_FORM.selectionRule)
      setAvailableLinks(EMPTY_FORM.availableLinks)
      setMinSelections(EMPTY_FORM.minSelections)
      setMaxSelections(EMPTY_FORM.maxSelections)
      return
    }

    if (typeof complementId === 'number') {
      setLoading(true)
      fetch(`${API_URL}/complements/${complementId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => r.json())
        .then((data: ComplementDto) => {
          setName(data.name ?? '')
          setDescription(data.description ?? '')
          setSelectionRule(data.selectionRule ?? 'SINGLE')
          setAvailableLinks(data.availableLinks ?? [])
          setMinSelections(data.minSelections ?? 0)
          setMaxSelections(data.maxSelections ?? 1)
        })
        .catch(() => toast.error('Erro ao carregar complemento'))
        .finally(() => setLoading(false))
    }
  }, [open, complementId])

  function toggleLink(link: ComplementLink) {
    setAvailableLinks((prev) =>
      prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link],
    )
  }

  function handleRuleChange(rule: ComplementSelectionRule) {
    setSelectionRule(rule)
    if (rule === 'SINGLE') setMaxSelections(1)
  }

  function handleRequiredChange(checked: boolean) {
    if (checked) {
      setMinSelections(1)
    } else {
      setMinSelections(0)
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!name.trim()) newErrors.name = 'Nome obrigatório'
    else if (name.length > 200) newErrors.name = 'Máximo 200 caracteres'

    if (availableLinks.length === 0) {
      newErrors.availableLinks = 'Selecione pelo menos um link'
    }

    if (selectionRule !== 'SINGLE') {
      if (minSelections > maxSelections) {
        newErrors.range = 'Mínimo não pode ser maior que máximo'
      } else if (isRequired && minSelections < 1) {
        newErrors.range = 'Quando obrigatório, mínimo deve ser pelo menos 1'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        selectionRule,
        minSelections,
        maxSelections: selectionRule === 'SINGLE' ? 1 : maxSelections,
        availableLinks,
      }

      if (complementId === 'new') {
        const res = await fetch(`${API_URL}/complements`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null) as { message?: string } | null
          throw new Error(err?.message ?? `Erro ${res.status}`)
        }
        toast.success('Complemento criado')
      } else {
        const res = await fetch(`${API_URL}/complements/${complementId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null) as { message?: string } | null
          throw new Error(err?.message ?? `Erro ${res.status}`)
        }
        toast.success('Complemento atualizado')
      }

      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar complemento')
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v && !submitting) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar complemento' : 'Criar complemento'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Seção 1: Informações */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Informações</h3>

              <div className="space-y-1">
                <Label htmlFor="comp-name">
                  Nome do complemento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="comp-name"
                  autoFocus
                  autoComplete="off"
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-describedby={errors.name ? 'comp-name-error' : undefined}
                  className={
                    errors.name
                      ? 'border-red-400 focus-visible:ring-red-400'
                      : 'focus-visible:ring-brand-red'
                  }
                  disabled={submitting}
                />
                {errors.name && (
                  <p id="comp-name-error" role="alert" className="mt-1 text-xs text-red-600">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="comp-desc">Descrição</Label>
                  <span className="text-xs text-gray-400">{description.length}/2000</span>
                </div>
                <Textarea
                  id="comp-desc"
                  maxLength={2000}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none focus-visible:ring-brand-red"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Seção 2: Links */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Disponível nos links de <span className="text-red-500">*</span>
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Onde este complemento aparecerá no cardápio
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {ALL_LINKS.map((link) => {
                  const active = availableLinks.includes(link)
                  return (
                    <button
                      key={link}
                      type="button"
                      onClick={() => toggleLink(link)}
                      disabled={submitting}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                        active
                          ? 'border-brand-red bg-brand-red text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                      )}
                    >
                      {LINK_LABELS[link]}
                    </button>
                  )
                })}
              </div>

              {errors.availableLinks && (
                <p role="alert" className="text-xs text-red-600">
                  {errors.availableLinks}
                </p>
              )}
            </div>

            {/* Seção 3: Regra de seleção */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                O cliente poderá escolher <span className="text-red-500">*</span>
              </h3>

              <RadioGroup
                value={selectionRule}
                onValueChange={(v) => handleRuleChange(v as ComplementSelectionRule)}
                disabled={submitting}
              >
                {ALL_RULES.map((rule) => (
                  <label
                    key={rule}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                      selectionRule === rule
                        ? 'border-brand-red bg-brand-red/5'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <RadioGroupItem value={rule} className="mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-900">{SELECTION_RULE_LABELS[rule]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Seção 4: Obrigatório */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Obrigatório</p>
                <p className="text-xs text-gray-500">
                  O cliente precisa escolher pelo menos uma opção
                </p>
              </div>
              <Switch
                checked={isRequired}
                onCheckedChange={handleRequiredChange}
                disabled={submitting}
              />
            </div>

            {/* Seção 5: Quantidade (apenas se não SINGLE) */}
            {selectionRule !== 'SINGLE' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Quantidade</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="comp-min">Mínimo</Label>
                    <Input
                      id="comp-min"
                      type="number"
                      min={isRequired ? 1 : 0}
                      value={minSelections}
                      onChange={(e) =>
                        setMinSelections(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="focus-visible:ring-brand-red"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="comp-max">Máximo</Label>
                    <Input
                      id="comp-max"
                      type="number"
                      min={1}
                      value={maxSelections}
                      onChange={(e) =>
                        setMaxSelections(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="focus-visible:ring-brand-red"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {errors.range && (
                  <p role="alert" className="text-xs text-red-600">
                    {errors.range}
                  </p>
                )}
              </div>
            )}

            {/* Placeholder Seção 6: Opções (Fase 3.3) */}
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-center text-xs text-gray-500">
                As opções serão configuradas após salvar o complemento (Fase 3.3)
              </p>
            </div>

            {/* Placeholder Seção 7: Configurações avançadas (Fase 3.5) */}
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-center text-xs text-gray-500">
                Configurações avançadas (cálculo de preço) em breve (Fase 3.5)
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
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
