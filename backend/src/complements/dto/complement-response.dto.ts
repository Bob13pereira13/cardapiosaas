import {
  ComplementLink,
  ComplementPriceMode,
  ComplementSelectionRule,
  ComplementVisibility,
  OptionStockStatus,
  Prisma,
} from '@prisma/client';

export class ComplementOptionResponseDto {
  id: number;
  optionId: number;
  extraPrice: Prisma.Decimal;
  isLocked: boolean;
  isVisible: boolean;
  sortOrder: number;
  option: {
    id: number;
    name: string;
    imageUrl: string | null;
    costPrice: Prisma.Decimal | null;
    stockStatus: OptionStockStatus;
    isActive: boolean;
  };
}

export class ComplementResponseDto {
  id: number;
  restaurantId: number;
  name: string;
  description: string | null;
  selectionRule: ComplementSelectionRule;
  minSelections: number;
  maxSelections: number;
  availableLinks: ComplementLink[];
  visibility: ComplementVisibility;
  priceMode: ComplementPriceMode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  options: ComplementOptionResponseDto[];
  usedInProducts?: number;
  productsUsing?: { id: number; name: string }[];
}

export interface PaginatedComplementsResponse {
  data: ComplementResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
