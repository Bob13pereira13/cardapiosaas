import { BadRequestException } from '@nestjs/common';
import { buildCustomerWhere } from './filter-builder';

const NOW = new Date('2026-05-12T12:00:00.000Z');
const RID = 7;

describe('buildCustomerWhere', () => {
  it('filtros vazios → só restaurantId', () => {
    expect(buildCustomerWhere({}, RID, NOW)).toEqual({ restaurantId: RID });
  });

  it('todos campos undefined → só restaurantId', () => {
    expect(
      buildCustomerWhere(
        {
          totalSpentMin: undefined,
          tags: undefined,
          daysSinceLastOrderMin: undefined,
        },
        RID,
        NOW,
      ),
    ).toEqual({ restaurantId: RID });
  });

  it('tags array vazio → ignora filtro de tag', () => {
    expect(buildCustomerWhere({ tags: [] }, RID, NOW)).toEqual({
      restaurantId: RID,
    });
  });

  it('totalSpentMin sozinho', () => {
    expect(buildCustomerWhere({ totalSpentMin: 100 }, RID, NOW)).toEqual({
      restaurantId: RID,
      AND: [{ totalSpent: { gte: 100 } }],
    });
  });

  it('totalSpentMin + totalSpentMax', () => {
    expect(
      buildCustomerWhere({ totalSpentMin: 100, totalSpentMax: 500 }, RID, NOW),
    ).toEqual({
      restaurantId: RID,
      AND: [{ totalSpent: { gte: 100 } }, { totalSpent: { lte: 500 } }],
    });
  });

  it('lança BadRequestException quando totalSpentMin > totalSpentMax', () => {
    expect(() =>
      buildCustomerWhere({ totalSpentMin: 500, totalSpentMax: 100 }, RID, NOW),
    ).toThrow(BadRequestException);
  });

  it('tags mode ALL (default) → hasEvery', () => {
    expect(
      buildCustomerWhere({ tags: ['VIP', 'FREQUENTE'] }, RID, NOW),
    ).toEqual({
      restaurantId: RID,
      AND: [{ tags: { hasEvery: ['VIP', 'FREQUENTE'] } }],
    });
  });

  it('tags mode ANY → hasSome', () => {
    expect(
      buildCustomerWhere({ tags: ['VIP'], tagsMode: 'ANY' }, RID, NOW),
    ).toEqual({
      restaurantId: RID,
      AND: [{ tags: { hasSome: ['VIP'] } }],
    });
  });

  it('daysSinceLastOrderMin inclui customers com lastOrderAt null', () => {
    const threshold = new Date('2026-04-12T12:00:00.000Z'); // now - 30 dias
    expect(buildCustomerWhere({ daysSinceLastOrderMin: 30 }, RID, NOW)).toEqual(
      {
        restaurantId: RID,
        AND: [
          { OR: [{ lastOrderAt: { lt: threshold } }, { lastOrderAt: null }] },
        ],
      },
    );
  });

  it('daysSinceLastOrderMax exclui customers com lastOrderAt null', () => {
    const threshold = new Date('2026-04-12T12:00:00.000Z'); // now - 30 dias
    expect(buildCustomerWhere({ daysSinceLastOrderMax: 30 }, RID, NOW)).toEqual(
      {
        restaurantId: RID,
        AND: [{ lastOrderAt: { gte: threshold } }],
      },
    );
  });

  it('lança BadRequestException quando daysSinceLastOrderMin > daysSinceLastOrderMax', () => {
    expect(() =>
      buildCustomerWhere(
        { daysSinceLastOrderMin: 60, daysSinceLastOrderMax: 30 },
        RID,
        NOW,
      ),
    ).toThrow(BadRequestException);
  });

  it('matchMode ANY constrói OR array', () => {
    expect(
      buildCustomerWhere(
        { matchMode: 'ANY', totalSpentMin: 100, hasFiadoOpen: true },
        RID,
        NOW,
      ),
    ).toEqual({
      restaurantId: RID,
      OR: [{ totalSpent: { gte: 100 } }, { fiadoTotal: { gt: 0 } }],
    });
  });

  it('hasFiadoOpen: true adiciona condição fiadoTotal > 0', () => {
    expect(buildCustomerWhere({ hasFiadoOpen: true }, RID, NOW)).toEqual({
      restaurantId: RID,
      AND: [{ fiadoTotal: { gt: 0 } }],
    });
  });

  it('hasFiadoOpen: false → nenhuma condição adicionada (MVP)', () => {
    expect(buildCustomerWhere({ hasFiadoOpen: false }, RID, NOW)).toEqual({
      restaurantId: RID,
    });
  });

  it('combinação: tags + totalSpentMin + daysSinceLastOrderMin', () => {
    const threshold = new Date('2026-04-28T12:00:00.000Z'); // now - 14 dias
    expect(
      buildCustomerWhere(
        { tags: ['VIP'], totalSpentMin: 200, daysSinceLastOrderMin: 14 },
        RID,
        NOW,
      ),
    ).toEqual({
      restaurantId: RID,
      AND: [
        { tags: { hasEvery: ['VIP'] } },
        { totalSpent: { gte: 200 } },
        { OR: [{ lastOrderAt: { lt: threshold } }, { lastOrderAt: null }] },
      ],
    });
  });

  it('hasFiadoOverdue ignorado — nenhuma condição adicionada (MVP)', () => {
    expect(buildCustomerWhere({ hasFiadoOverdue: true }, RID, NOW)).toEqual({
      restaurantId: RID,
    });
  });
});
