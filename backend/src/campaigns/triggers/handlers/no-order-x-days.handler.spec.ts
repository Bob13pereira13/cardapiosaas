/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NoOrderXDaysHandler } from './no-order-x-days.handler';

describe('NoOrderXDaysHandler', () => {
  let handler: NoOrderXDaysHandler;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoOrderXDaysHandler,
        {
          provide: PrismaService,
          useValue: {
            customer: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = module.get(NoOrderXDaysHandler);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. triggerType is NO_ORDER_X_DAYS', () => {
    expect(handler.triggerType).toBe(TriggerType.NO_ORDER_X_DAYS);
  });

  it('2. lastOrderAt=35d ago, days=30 → matched', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([{ id: 5 }]);
    const result = await handler.findMatches(1, { days: 30 });
    expect(result).toEqual([5]);
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    expect(where.restaurantId).toBe(1);
    // threshold should be a Date ~30 days ago
    expect(where.OR[0].lastOrderAt.lt).toBeInstanceOf(Date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    expect(
      Math.abs(where.OR[0].lastOrderAt.lt.getTime() - thirtyDaysAgo.getTime()),
    ).toBeLessThan(2000);
  });

  it('3. lastOrderAt=null + createdAt=45d ago, days=30 → matched', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([{ id: 7 }]);
    const result = await handler.findMatches(1, { days: 30 });
    expect(result).toEqual([7]);
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    expect(where.OR[1].lastOrderAt).toBeNull();
    expect(where.OR[1].createdAt.lt).toBeInstanceOf(Date);
  });

  it('4. no matches → empty array', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, { days: 30 });
    expect(result).toEqual([]);
  });

  it('5. config without days → defaults to 30', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(1, {});
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    expect(
      Math.abs(where.OR[0].lastOrderAt.lt.getTime() - thirtyDaysAgo.getTime()),
    ).toBeLessThan(2000);
  });

  it('6. config days=7 → threshold is 7 days ago', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(1, { days: 7 });
    const where = (prisma.customer.findMany as jest.Mock).mock.calls[0][0]
      .where;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    expect(
      Math.abs(where.OR[0].lastOrderAt.lt.getTime() - sevenDaysAgo.getTime()),
    ).toBeLessThan(2000);
  });
});
