/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FirstOrderPlacedHandler } from './first-order-placed.handler';

describe('FirstOrderPlacedHandler', () => {
  let handler: FirstOrderPlacedHandler;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirstOrderPlacedHandler,
        {
          provide: PrismaService,
          useValue: {
            customer: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = module.get(FirstOrderPlacedHandler);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. triggerType is FIRST_ORDER_PLACED', () => {
    expect(handler.triggerType).toBe(TriggerType.FIRST_ORDER_PLACED);
  });

  it('2. firstOrderAt=2h ago + firstOrderTriggered=false → matched', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([{ id: 99 }]);
    const result = await handler.findMatches(1, {});
    expect(result).toEqual([99]);
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    expect(where.firstOrderTriggered).toBe(false);
    expect(where.firstOrderAt.gte).toBeInstanceOf(Date);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      Math.abs(where.firstOrderAt.gte.getTime() - twentyFourHoursAgo.getTime()),
    ).toBeLessThan(2000);
  });

  it('3. firstOrderAt=30h ago → not matched (DB handles; we verify threshold direction)', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, {});
    expect(result).toEqual([]);
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    // gte means firstOrderAt must be >= 24h ago threshold → 30h ago would fail DB filter
    expect(where.firstOrderAt.gte).toBeInstanceOf(Date);
  });

  it('4. firstOrderTriggered=true → not matched (query always filters false)', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(1, {});
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    expect(where.firstOrderTriggered).toBe(false);
  });

  it('5. no matches → empty array', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, {});
    expect(result).toEqual([]);
  });
});
