/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { AgendamentoTipo, CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';

const DISPATCH_RESULT = {
  dispatchId: 1,
  totalMessages: 3,
  sentCount: 3,
  failedCount: 0,
  skippedNoPhone: 0,
};

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  restaurantId: 1,
  status: CampaignStatus.SCHEDULED,
  agendamentoTipo: AgendamentoTipo.SCHEDULED,
  scheduledAt: new Date(Date.now() - 60_000), // 1 min in past
  recurringCron: null,
  recurringEndsAt: null,
  ...overrides,
});

describe('CampaignSchedulerService', () => {
  let service: CampaignSchedulerService;
  let prisma: jest.Mocked<PrismaService>;
  let dispatch: jest.Mocked<DispatchService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignSchedulerService,
        {
          provide: PrismaService,
          useValue: {
            campaign: {
              findMany: jest.fn().mockResolvedValue([makeCampaign()]),
              update: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: DispatchService,
          useValue: {
            sendForScheduled: jest.fn().mockResolvedValue(DISPATCH_RESULT),
          },
        },
      ],
    }).compile();

    service = module.get(CampaignSchedulerService);
    prisma = module.get(PrismaService);
    dispatch = module.get(DispatchService);
  });

  it('1. no due campaigns → processed=0, sendForScheduled not called', async () => {
    (prisma.campaign.findMany as jest.Mock).mockResolvedValueOnce([]);
    const result = await service.processScheduledCampaigns();
    expect(result.processed).toBe(0);
    expect(dispatch.sendForScheduled).not.toHaveBeenCalled();
  });

  it('2. one SCHEDULED campaign due → sendForScheduled called once, processed=1', async () => {
    const result = await service.processScheduledCampaigns();
    expect(result.processed).toBe(1);
    expect(dispatch.sendForScheduled).toHaveBeenCalledWith(1);
    // SCHEDULED (one-time): no re-schedule update
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it('3. RECURRING with valid next run → re-schedules campaign', async () => {
    (prisma.campaign.findMany as jest.Mock).mockResolvedValueOnce([
      makeCampaign({
        agendamentoTipo: AgendamentoTipo.RECURRING,
        recurringCron: '*/5 * * * *',
        recurringEndsAt: null,
      }),
    ]);

    await service.processScheduledCampaigns();

    expect(dispatch.sendForScheduled).toHaveBeenCalledWith(1);
    const updateCall = (prisma.campaign.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe(CampaignStatus.SCHEDULED);
    expect(updateCall.data.scheduledAt).toBeInstanceOf(Date);
  });

  it('4. RECURRING with endsAt in past → marks COMPLETED after dispatch', async () => {
    (prisma.campaign.findMany as jest.Mock).mockResolvedValueOnce([
      makeCampaign({
        agendamentoTipo: AgendamentoTipo.RECURRING,
        recurringCron: '*/5 * * * *',
        recurringEndsAt: new Date(Date.now() - 86_400_000), // yesterday
      }),
    ]);

    await service.processScheduledCampaigns();

    expect(dispatch.sendForScheduled).toHaveBeenCalledWith(1);
    const updateCall = (prisma.campaign.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe(CampaignStatus.COMPLETED);
  });

  it('5. sendForScheduled throws → campaign reset to SCHEDULED, processed=0', async () => {
    (dispatch.sendForScheduled as jest.Mock).mockRejectedValueOnce(
      new Error('Z-API offline'),
    );

    const result = await service.processScheduledCampaigns();

    expect(result.processed).toBe(0);
    const updateCall = (prisma.campaign.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe(CampaignStatus.SCHEDULED);
  });

  it('6. take limit 20 passed to findMany', async () => {
    (prisma.campaign.findMany as jest.Mock).mockResolvedValueOnce([]);
    await service.processScheduledCampaigns();
    const findManyCall = (prisma.campaign.findMany as jest.Mock).mock
      .calls[0][0];
    expect(findManyCall.take).toBe(20);
  });
});
