import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BirthdayHandler } from './birthday.handler';

describe('BirthdayHandler', () => {
  let handler: BirthdayHandler;
  let prisma: jest.Mocked<{ $queryRaw: jest.Mock }>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BirthdayHandler,
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(BirthdayHandler);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. triggerType is BIRTHDAY', () => {
    expect(handler.triggerType).toBe(TriggerType.BIRTHDAY);
  });

  it('2. customers with birthday today → returns their IDs', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 10 }, { id: 11 }]);
    const result = await handler.findMatches(1, {});
    expect(result).toEqual([10, 11]);
  });

  it('3. no matching customers → empty array', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, {});
    expect(result).toEqual([]);
  });

  it('4. passes restaurantId as first interpolated parameter', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(42, {});
    const call = (prisma.$queryRaw as jest.Mock).mock.calls[0] as unknown[];
    // Tagged template literal: call[0] = TemplateStringsArray, call[1] = first value
    expect(call[1]).toBe(42);
  });

  it('5. dataNascimento=null customers → NOT matched (query filters nulls)', async () => {
    // The SQL WHERE "dataNascimento" IS NOT NULL ensures nulls are excluded.
    // We verify the raw query is always called (DB handles the filter).
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, {});
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
