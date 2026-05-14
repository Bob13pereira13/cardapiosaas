export type OptionStockStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'HIDDEN'

export interface OptionDto {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  codePdv: string | null
  costPrice: string | null
  useTechSheet: boolean
  stockStatus: OptionStockStatus
  isActive: boolean
  createdAt: string
  updatedAt: string
  usedInComplements?: number
  complementsUsing?: Array<{ id: number; name: string }>
}

export interface CreateOptionInput {
  name: string
  description?: string
  codePdv?: string
  costPrice?: number
  useTechSheet?: boolean
  stockStatus?: OptionStockStatus
  isActive?: boolean
}

export type UpdateOptionInput = Partial<CreateOptionInput>

export interface PaginatedOptions {
  data: OptionDto[]
  total: number
  page: number
  totalPages: number
}
