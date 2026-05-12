/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ZApiClientService } from '../zapi-client.service';
import { ZApiMockSimulatorService } from './zapi-mock-simulator.service';
import { ZApiWebhookService } from './zapi-webhook.service';

const makeSentMsg = (id: number) => ({
  id,
  zapiMessageId: `mock-sent-${id}`,
});

const makeDeliveredMsg = (id: number) => ({
  id,
  zapiMessageId: `mock-del-${id}`,
});

describe('ZApiMockSimulatorService', () => {
  let service: ZApiMockSimulatorService;
  let prisma: jest.Mocked<PrismaService>;
  let zapi: jest.Mocked<ZApiClientService>;
  let webhook: jest.Mocked<ZApiWebhookService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZApiMockSimulatorService,
        {
          provide: PrismaService,
          useValue: {
            campaignMessage: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: ZApiClientService,
          useValue: { isMockMode: true },
        },
        {
          provide: ZApiWebhookService,
          useValue: {
            processEvent: jest
              .fn()
              .mockResolvedValue({ received: true, matched: true }),
          },
        },
      ],
    }).compile();

    service = module.get(ZApiMockSimulatorService);
    prisma = module.get(PrismaService);
    zapi = module.get(ZApiClientService);
    webhook = module.get(ZApiWebhookService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. isMockMode=false → NO-OP, no DB queries', async () => {
    (zapi as { isMockMode: boolean }).isMockMode = false;
    (prisma.campaignMessage.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.simulateMockEvents();
    expect(result).toEqual({ delivered: 0, read: 0 });
    expect(prisma.campaignMessage.findMany).not.toHaveBeenCalled();
  });

  it('2. SENT messages → processEvent DELIVERED called for 80% chance', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 < 0.8 → always fires
    (prisma.campaignMessage.findMany as jest.Mock)
      .mockResolvedValueOnce([makeSentMsg(1), makeSentMsg(2), makeSentMsg(3)])
      .mockResolvedValueOnce([]); // Phase 2: no delivered

    const result = await service.simulateMockEvents();

    expect(webhook.processEvent).toHaveBeenCalledTimes(3);
    expect(webhook.processEvent).toHaveBeenCalledWith(
      'DELIVERED',
      'mock-sent-1',
    );
    expect(result.delivered).toBe(3);
    expect(result.read).toBe(0);
  });

  it('3. random >= 0.8 → skips DELIVERED', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 >= 0.8 → skips
    (prisma.campaignMessage.findMany as jest.Mock)
      .mockResolvedValueOnce([makeSentMsg(1)])
      .mockResolvedValueOnce([]);

    const result = await service.simulateMockEvents();

    expect(webhook.processEvent).not.toHaveBeenCalled();
    expect(result.delivered).toBe(0);
  });

  it('4. DELIVERED messages → processEvent READ called for 50% chance', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.3); // 0.3 < 0.5 → fires
    (prisma.campaignMessage.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // Phase 1: no sent
      .mockResolvedValueOnce([makeDeliveredMsg(10), makeDeliveredMsg(11)]);

    const result = await service.simulateMockEvents();

    expect(webhook.processEvent).toHaveBeenCalledTimes(2);
    expect(webhook.processEvent).toHaveBeenCalledWith('READ', 'mock-del-10');
    expect(result.read).toBe(2);
  });

  it('5. Phase 1 query filters by SENT status and sentAt < 10s ago', async () => {
    (prisma.campaignMessage.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.simulateMockEvents();

    const phase1Call = (prisma.campaignMessage.findMany as jest.Mock).mock
      .calls[0][0];
    expect(phase1Call.where.status).toBe(MessageStatus.SENT);
    expect(phase1Call.where.sentAt.lt).toBeInstanceOf(Date);
    expect(phase1Call.take).toBe(50);
  });

  it('6. Phase 2 query filters by DELIVERED status and deliveredAt < 20s ago', async () => {
    (prisma.campaignMessage.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.simulateMockEvents();

    const phase2Call = (prisma.campaignMessage.findMany as jest.Mock).mock
      .calls[1][0];
    expect(phase2Call.where.status).toBe(MessageStatus.DELIVERED);
    expect(phase2Call.where.deliveredAt.lt).toBeInstanceOf(Date);
    expect(phase2Call.take).toBe(50);
  });
});
