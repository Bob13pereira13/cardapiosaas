import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FirstOrderAnniversaryHandler } from './first-order-anniversary.handler';

describe('FirstOrderAnniversaryHandler', () => {
  let handler: FirstOrderAnniversaryHandler;
  let prisma: jest.Mocked<{ $queryRaw: jest.Mock }>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirstOrderAnniversaryHandler,
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(FirstOrderAnniversaryHandler);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. triggerType is FIRST_ORDER_ANNIVERSARY', () => {
    expect(handler.triggerType).toBe(TriggerType.FIRST_ORDER_ANNIVERSARY);
  });

  it('2. customer with 1-year anniversary today → returns ID', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 20 }]);
    const result = await handler.findMatches(1, { years: 1 });
    expect(result).toEqual([20]);
  });

  it('3. customer with firstOrderAt 6 months ago → not matched (DB handles filter)', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, { years: 1 });
    expect(result).toEqual([]);
  });

  it('4. years=2 config → passes 2 as interpolated parameter', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(5, { years: 2 });
    const call = (prisma.$queryRaw as jest.Mock).mock.calls[0] as unknown[];
    // Tagged template: call[0]=TemplateStringsArray, call[1]=restaurantId, call[2]=years
    expect(call[1]).toBe(5);
    expect(call[2]).toBe(2);
  });

  it('5. config without years → defaults to 1', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await handler.findMatches(3, {});
    const call = (prisma.$queryRaw as jest.Mock).mock.calls[0] as unknown[];
    expect(call[2]).toBe(1);
  });

  it('6. firstOrderAt=null customers → NOT matched (SQL WHERE IS NOT NULL)', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await handler.findMatches(1, {});
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
