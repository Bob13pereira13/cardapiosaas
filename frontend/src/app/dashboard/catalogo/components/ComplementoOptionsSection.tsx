'use client'

import { useEffect, useRef, useState } from 'react'
import { GripVertical, ImageIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { ComplementOptionDto } from '@/lib/complement-types'
import type { OptionDto } from '@/lib/option-types'
import { useComplementMutations } from '../hooks/useComplementMutations'
import { OptionAutocomplete } from './OptionAutocomplete'

export interface ComplementoOptionsSectionProps {
  complementId: number | null
  options: ComplementOptionDto[]
  onChange: (newOptions: ComplementOptionDto[]) => void
  onCreateNewOption: (initialName: string) => void
  disabled?: boolean
}

interface OptionRowProps {
  complementOption: ComplementOptionDto
  onUpdate: (updates: { extraPrice?: number; isVisible?: boolean }) => void
  onRemove: () => void
  disabled?: boolean
}

function SortableOptionRow({ complementOption, onUpdate, onRemove, disabled }: OptionRowProps) {
  const { option } = complementOption
  const [extraPrice, setExtraPrice] = useState(complementOption.extraPrice)
  const [isVisible, setIsVisible] = useState(complementOption.isVisible)
  const isFirstMount = useRef(true)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: complementOption.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  }

  useEffect(() => {
    setExtraPrice(complementOption.extraPrice)
  }, [complementOption.extraPrice])

  useEffect(() => {
    setIsVisible(complementOption.isVisible)
  }, [complementOption.isVisible])

  // Debounce extraPrice → onUpdate
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    const t = setTimeout(() => {
      onUpdate({ extraPrice: parseFloat(extraPrice) || 0 })
    }, 500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPrice])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-white px-3 py-2',
        isDragging
          ? 'border-brand-red shadow-lg'
          : 'border-gray-100 hover:border-gray-200',
      )}
    >
      {/* Drag handle — touch-none previne conflito com scroll em mobile */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="touch-none cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Arrastar ${option.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Image */}
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
        {option.imageUrl ? (
          <img
            src={option.imageUrl}
            alt={option.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="m-2 h-4 w-4 text-gray-300" />
        )}
      </div>

      {/* Name + stock */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{option.name}</p>
        {option.stockStatus === 'OUT_OF_STOCK' && (
          <p className="text-xs text-amber-700">Em falta</p>
        )}
      </div>

      {/* Extra price */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">R$</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={extraPrice}
          onChange={(e) => setExtraPrice(e.target.value)}
          className="h-8 w-20 text-sm focus-visible:ring-brand-red"
          disabled={disabled}
          aria-label={`Preço extra de ${option.name}`}
        />
      </div>

      {/* Visible switch */}
      <Switch
        checked={isVisible}
        onCheckedChange={(v) => {
          setIsVisible(v)
          onUpdate({ isVisible: v })
        }}
        disabled={disabled}
        aria-label={`${isVisible ? 'Visível' : 'Oculta'}: ${option.name}`}
      />

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
        aria-label={`Remover ${option.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ComplementoOptionsSection({
  complementId,
  options: optionsProp,
  onChange,
  onCreateNewOption,
  disabled,
}: ComplementoOptionsSectionProps) {
  const [options, setOptions] = useState<ComplementOptionDto[]>(optionsProp)
  const prevKeyRef = useRef('')
  const mutations = useComplementMutations()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Re-sync from parent when options change (e.g., after loading from API)
  useEffect(() => {
    const key = optionsProp.map((o) => `${o.id}:${o.optionId}`).join(',')
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key
      setOptions(optionsProp)
    }
  }, [optionsProp])

  function updateOptions(newOptions: ComplementOptionDto[]) {
    setOptions(newOptions)
    onChange(newOptions)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = options.findIndex((o) => o.id === active.id)
    const newIndex = options.findIndex((o) => o.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = [...options]
    const reordered = arrayMove(options, oldIndex, newIndex)
    updateOptions(reordered)

    if (complementId !== null) {
      // Filter temp (not-yet-persisted) options — backend only knows positive IDs
      const optionIds = reordered.filter((o) => o.id > 0).map((o) => o.optionId)
      if (optionIds.length === 0) return

      try {
        await mutations.reorderOptions(complementId, optionIds)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao reordenar opções')
        updateOptions(previous)
      }
    }
  }

  async function handleAddOption(option: OptionDto) {
    const tempId = -Date.now()
    const newOpt: ComplementOptionDto = {
      id: tempId,
      optionId: option.id,
      extraPrice: '0',
      isLocked: false,
      isVisible: true,
      sortOrder: options.length,
      option: {
        id: option.id,
        name: option.name,
        imageUrl: option.imageUrl,
        stockStatus: option.stockStatus,
        isActive: option.isActive,
      },
    }
    updateOptions([...options, newOpt])

    if (complementId !== null) {
      try {
        const result = await mutations.addOption(complementId, option.id)
        const realId = (result as unknown as { id?: number }).id ?? tempId
        setOptions((prev) => {
          const updated = prev.map((o) => (o.id === tempId ? { ...o, id: realId } : o))
          onChange(updated)
          return updated
        })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao adicionar opção')
        setOptions((prev) => {
          const reverted = prev.filter((o) => o.id !== tempId)
          onChange(reverted)
          return reverted
        })
      }
    }
  }

  async function handleRemoveOption(complementOptionId: number) {
    const opt = options.find((o) => o.id === complementOptionId)
    if (!opt) return

    const previous = [...options]
    updateOptions(options.filter((o) => o.id !== complementOptionId))

    if (complementId !== null && complementOptionId > 0) {
      try {
        await mutations.removeOption(complementId, opt.optionId)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao remover opção')
        updateOptions(previous)
      }
    }
  }

  async function handleUpdateOption(
    complementOptionId: number,
    updates: { extraPrice?: number; isVisible?: boolean },
  ) {
    const opt = options.find((o) => o.id === complementOptionId)
    if (!opt) return

    const previous = [...options]
    const updated = options.map((o) =>
      o.id === complementOptionId
        ? {
            ...o,
            ...updates,
            extraPrice:
              updates.extraPrice !== undefined ? String(updates.extraPrice) : o.extraPrice,
          }
        : o,
    )
    updateOptions(updated)

    if (complementId !== null && complementOptionId > 0) {
      try {
        await mutations.updateOption(complementId, opt.optionId, updates)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar opção')
        updateOptions(previous)
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Opções ({options.length})</h3>
        {options.length === 0 && (
          <span className="text-xs text-gray-500">Adicione opções abaixo</span>
        )}
      </div>

      {options.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <SortableContext
            items={options.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 rounded-lg border border-gray-200 p-2">
              {options.map((opt) => (
                <SortableOptionRow
                  key={opt.id}
                  complementOption={opt}
                  onUpdate={(updates) => void handleUpdateOption(opt.id, updates)}
                  onRemove={() => void handleRemoveOption(opt.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <OptionAutocomplete
        excludeOptionIds={options.map((o) => o.optionId)}
        onSelect={(option) => void handleAddOption(option)}
        onCreateNew={onCreateNewOption}
        disabled={disabled}
      />
    </div>
  )
}
