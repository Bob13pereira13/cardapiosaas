import { OptionStockStatus, Prisma } from '@prisma/client';

export class OptionResponseDto {
  id: number;
  restaurantId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  codePdv: string | null;
  costPrice: Prisma.Decimal | null;
  useTechSheet: boolean;
  stockStatus: OptionStockStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usedInComplements?: number;
  complementsUsing?: { id: number; name: string }[];
}

export interface PaginatedOptionsResponse {
  data: OptionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
