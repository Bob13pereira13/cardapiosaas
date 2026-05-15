export type ProductLabel = 'HIGHLIGHT' | 'RECOMMENDED' | 'NEW' | 'LIMITED_EDITION'
export type ProductUnit = 'UNIT' | 'KG' | 'GRAM' | 'LITER' | 'ML' | 'PORTION'
export type ProductOrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
export type ProductLink = 'DELIVERY' | 'MESA_PUBLIC' | 'MESA_INTERNAL' | 'BALCAO' | 'PREVIEW'

export interface ProductDto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  imagem: string | null
  disponivel: boolean
  displayOrder: number
  precoPromocional: number | null
  tempoPreparo: number | null
  sku: string | null
  emDestaque: boolean
  estoqueAtivo: boolean
  estoque: number

  isPromotional: boolean
  promoStartsAt: string | null
  promoEndsAt: string | null
  promoSchedule: unknown | null
  costPrice: string | null
  useTechSheet: boolean
  codePdv: string | null
  internalCode: string | null
  labelType: ProductLabel | null
  unitOfMeasure: ProductUnit
  useCustomNameKds: boolean
  customNameKds: string | null
  hideObservations: boolean
  hideQtyButtons: boolean
  isNew: boolean
  isAdult: boolean
  isServiceFeeFree: boolean
  orderTypes: ProductOrderType[]
  availableLinks: ProductLink[]

  categoryId: number | null
  restaurantId: number
  deletedAt: string | null

  category?: { id: number; nome: string } | null
}

export interface ListProductsResponse {
  data: ProductDto[]
  total: number
  page: number
  totalPages: number
  limit: number
}

export const LABEL_BADGES: Record<ProductLabel, { label: string; color: string }> = {
  HIGHLIGHT: { label: 'Destaque', color: 'bg-purple-100 text-purple-700' },
  RECOMMENDED: { label: 'Recomendado', color: 'bg-blue-100 text-blue-700' },
  NEW: { label: 'Novidade', color: 'bg-emerald-100 text-emerald-700' },
  LIMITED_EDITION: { label: 'Edição limitada', color: 'bg-amber-100 text-amber-700' },
}
