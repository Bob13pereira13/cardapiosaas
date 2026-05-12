import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FiadoLimitNearHandler } from './fiado-limit-near.handler';

describe('FiadoLimitNearHandler', () => {
  let handler: FiadoLimitNearHandler;
  let prisma: jest.Mocked<{ $queryRaw: jest.Mock }>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiadoLimitNearHandler,
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(FiadoLimitNearHandler);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. triggerType is FIADO_LIMIT_NEAR', () => {
    expect(handler.triggerType).toBe(TriggerType.FIADO_LIMIT_NEAR);
  });

  it('2. fiadoTotal >= 90% of fiadoLimite → matched', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 30 }]);
    const result = await handler.findMatches(1, { thresholdPercent: 90 });
    expect(result).toEqual([30]);
  });

  it('3. fiadoTotal < 60% of fiadoLimite → not matched (DB handles filter)', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, { thresholdPercent: 90 });
    expect(result).toEqual([]);
  });

  it('4. fiadoLimite=0 → not matched (WHERE fiadoLimite > 0 excludes them)', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, {});
    expect(result).toEqual([]);
  });

  it('5. fiadoTotal > fiadoLimite (>100%) → matched', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 31 }, { id: 32 }]);
    const result = await handler.findMatches(1, { thresholdPercent: 90 });
    expect(result).toEqual([31, 32]);
  });

  it('6. config thresholdPercent=80 → passes 80 as interpolated parameter', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(7, { thresholdPercent: 80 });
    const call = (prisma.$queryRaw as jest.Mock).mock.calls[0] as unknown[];
    // Tagged template: call[0]=TemplateStringsArray, call[1]=restaurantId, call[2]=threshold
    expect(call[1]).toBe(7);
    expect(call[2]).toBe(80);
  });

  it('7. config without thresholdPercent → defaults to 90', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(1, {});
    const call = (prisma.$queryRaw as jest.Mock).mock.calls[0] as unknown[];
    expect(call[2]).toBe(90);
  });
});
