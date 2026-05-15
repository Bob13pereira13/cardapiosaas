'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { type ComplementPriceMode, PRICE_MODE_LABELS } from '@/lib/complement-types'

interface ComplementoConfigsAvancadasProps {
  value: ComplementPriceMode
  onChange: (v: ComplementPriceMode) => void
  disabled?: boolean
}

const PRICE_MODES: ComplementPriceMode[] = [
  'SUM_OF_SELECTED',
  'AVERAGE_OF_SELECTED',
  'HIGHEST_SELECTED',
  'LOWEST_SELECTED',
]

export function ComplementoConfigsAvancadas({
  value,
  onChange,
  disabled,
}: ComplementoConfigsAvancadasProps) {
  return (
    <Accordion type="single" collapsible className="rounded-lg border border-gray-200">
      <AccordionItem value="precos" className="border-none">
        <AccordionTrigger className="px-4 hover:no-underline">
          <span className="text-sm font-semibold text-gray-900">Configurações avançadas</span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">O preço do complemento será:</p>
              <p className="mt-1 text-xs text-gray-500">
                Define como calcular o preço quando o cliente escolhe múltiplas opções
              </p>
            </div>

            <RadioGroup
              value={value}
              onValueChange={(v) => onChange(v as ComplementPriceMode)}
              disabled={disabled}
              className="space-y-2"
            >
              {PRICE_MODES.map((mode) => (
                <label
                  key={mode}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition',
                    value === mode
                      ? 'border-brand-red bg-brand-red/5'
                      : 'border-gray-200 hover:border-gray-300',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <RadioGroupItem value={mode} className="mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-900">{PRICE_MODE_LABELS[mode]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
