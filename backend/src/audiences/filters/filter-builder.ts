import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type FilterDSL = {
  matchMode?: 'ALL' | 'ANY';
  tags?: string[];
  tagsMode?: 'ALL' | 'ANY';
  totalSpentMin?: number;
  totalSpentMax?: number;
  daysSinceLastOrderMin?: number;
  daysSinceLastOrderMax?: number;
  hasFiadoOpen?: boolean;
  hasFiadoOverdue?: boolean;
  // TODO(MVP): orderCountMin/orderCountMax removed. Adicionar quando houver demanda real.
  //   Pattern: migration denormalizada Customer.orderCount + hook create/cancel/uncancel.
  // TODO(MVP): hasFiadoOverdue não implementado. Requer column-to-column comparison
  //   (fiadoTotal > fiadoLimite) que Prisma WHERE não suporta nativamente.
  //   Implementar via $queryRaw retornando customer IDs e passando pro where { id: { in } }.
};

function buildConditions(
  filtros: FilterDSL,
  now: Date,
): Prisma.CustomerWhereInput[] {
  const conditions: Prisma.CustomerWhereInput[] = [];

  if (filtros.tags?.length) {
    const mode = filtros.tagsMode ?? 'ALL';
    conditions.push({
      tags:
        mode === 'ANY' ? { hasSome: filtros.tags } : { hasEvery: filtros.tags },
    });
  }

  if (filtros.totalSpentMin != null) {
    conditions.push({ totalSpent: { gte: filtros.totalSpentMin } });
  }
  if (filtros.totalSpentMax != null) {
    conditions.push({ totalSpent: { lte: filtros.totalSpentMax } });
  }

  if (filtros.daysSinceLastOrderMin != null) {
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - filtros.daysSinceLastOrderMin);
    // null lastOrderAt = nunca pediu = dias infinitos desde último pedido → inclui
    conditions.push({
      OR: [{ lastOrderAt: { lt: threshold } }, { lastOrderAt: null }],
    });
  }
  if (filtros.daysSinceLastOrderMax != null) {
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - filtros.daysSinceLastOrderMax);
    conditions.push({ lastOrderAt: { gte: threshold } });
  }

  if (filtros.hasFiadoOpen === true) {
    conditions.push({ fiadoTotal: { gt: 0 } });
  }

  // hasFiadoOverdue: ignorado no MVP — ver TODO acima

  return conditions;
}

export function buildCustomerWhere(
  filtros: FilterDSL,
  restaurantId: number,
  now: Date = new Date(),
): Prisma.CustomerWhereInput {
  if (
    filtros.totalSpentMin != null &&
    filtros.totalSpentMax != null &&
    filtros.totalSpentMin > filtros.totalSpentMax
  ) {
    throw new BadRequestException(
      'totalSpentMin não pode ser maior que totalSpentMax.',
    );
  }
  if (
    filtros.daysSinceLastOrderMin != null &&
    filtros.daysSinceLastOrderMax != null &&
    filtros.daysSinceLastOrderMin > filtros.daysSinceLastOrderMax
  ) {
    throw new BadRequestException(
      'daysSinceLastOrderMin não pode ser maior que daysSinceLastOrderMax.',
    );
  }

  const base: Prisma.CustomerWhereInput = { restaurantId };
  const conditions = buildConditions(filtros, now);

  if (conditions.length === 0) return base;

  if (filtros.matchMode === 'ANY') {
    return { ...base, OR: conditions };
  }

  return { ...base, AND: conditions };
}
