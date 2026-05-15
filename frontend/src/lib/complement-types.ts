import type { OptionDto } from './option-types'

export type ComplementSelectionRule = 'SINGLE' | 'MULTI_NO_REPEAT' | 'MULTI_REPEAT'
export type ComplementLink = 'DELIVERY' | 'BALCAO' | 'MESA_PUBLIC' | 'MESA_INTERNAL' | 'PREVIEW'
export type ComplementVisibility = 'VISIBLE' | 'HIDDEN'
export type ComplementPriceMode =
  | 'SUM_OF_SELECTED'
  | 'AVERAGE_OF_SELECTED'
  | 'HIGHEST_SELECTED'
  | 'LOWEST_SELECTED'

export interface ComplementOptionDto {
  id: number
  optionId: number
  extraPrice: string
  isLocked: boolean
  isVisible: boolean
  sortOrder: number
  option: Pick<OptionDto, 'id' | 'name' | 'imageUrl' | 'stockStatus' | 'isActive'>
}

export interface ComplementDto {
  id: number
  name: string
  description: string | null
  selectionRule: ComplementSelectionRule
  minSelections: number
  maxSelections: number
  availableLinks: ComplementLink[]
  visibility: ComplementVisibility
  priceMode: ComplementPriceMode
  isActive: boolean
  createdAt: string
  updatedAt: string
  options: ComplementOptionDto[]
  usedInProducts?: number
  productsUsing?: Array<{ id: number; name: string }>
}

export interface CreateComplementInput {
  name: string
  description?: string
  selectionRule: ComplementSelectionRule
  minSelections: number
  maxSelections: number
  availableLinks: ComplementLink[]
  visibility?: ComplementVisibility
  priceMode?: ComplementPriceMode
  options?: Array<{
    optionId: number
    extraPrice?: number
    isLocked?: boolean
    isVisible?: boolean
    sortOrder?: number
  }>
}

export type UpdateComplementInput = Partial<Omit<CreateComplementInput, 'options'>>

export const SELECTION_RULE_LABELS: Record<ComplementSelectionRule, string> = {
  SINGLE: 'Apenas uma das opções',
  MULTI_NO_REPEAT: 'Mais de uma opção sem repetição',
  MULTI_REPEAT: 'Mais de uma opção com repetição',
}

export const LINK_LABELS: Record<ComplementLink, string> = {
  DELIVERY: 'Delivery',
  BALCAO: 'Balcão',
  MESA_PUBLIC: 'Mesa (público)',
  MESA_INTERNAL: 'Mesa (interno)',
  PREVIEW: 'Visualização',
}

export const PRICE_MODE_LABELS: Record<ComplementPriceMode, string> = {
  SUM_OF_SELECTED: 'A soma dos preços das opções escolhidas',
  AVERAGE_OF_SELECTED: 'A média dos preços das opções escolhidas',
  HIGHEST_SELECTED: 'O preço da opção mais cara escolhida',
  LOWEST_SELECTED: 'O preço da opção mais barata escolhida',
}
