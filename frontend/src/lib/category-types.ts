export interface CategoryDto {
  id: number
  nome: string
  displayOrder: number
  ativa: boolean
  icone: string | null
  restaurantId: number
  productsCount?: number
}

export interface CreateCategoryInput {
  nome: string
  displayOrder?: number
  ativa?: boolean
  icone?: string
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>
