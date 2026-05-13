/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { TriggerSubscriptionsService } from './trigger-subscriptions.service';

const makeSub = (overrides = {}) => ({
  id: 1,
  restaurantId: 1,
  campaignId: 10,
  triggerType: TriggerType.BIRTHDAY,
  triggerConfig: {},
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  campaign: { id: 10, nome: 'Aniversariantes', status: 'DRAFT' },
  ...overrides,
});

describe('TriggerSubscriptionsService', () => {
  let service: TriggerSubscriptionsService;
  let prisma: {
    campaign: { findFirst: jest.Mock };
    triggerSubscription: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    customer: { updateMany: jest.Mock };
  };
  let dispatch: { dispatchToCustomers: jest.Mock };
  let handlers: Record<string, { findMatches: jest.Mock }>;

  beforeEach(async () => {
    prisma = {
      campaign: { findFirst: jest.fn() },
      triggerSubscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customer: { updateMany: jest.fn() },
    };
    dispatch = { dispatchToCustomers: jest.fn() };
    handlers = {
      [TriggerType.BIRTHDAY]: { findMatches: jest.fn() },
      [TriggerType.FIRST_ORDER_PLACED]: { findMatches: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerSubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: DispatchService, useValue: dispatch },
        { provide: 'TRIGGER_HANDLERS', useValue: handlers },
      ],
    }).compile();

    service = module.get(TriggerSubscriptionsService);
  });

  afterEach(() => jest.restoreAllMocks());

  // --- create ---

  it('S.1: create → returns subscription with ativo=true default', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 10 });
    prisma.triggerSubscription.findUnique.mockResolvedValue(null);
    prisma.triggerSubscription.create.mockResolvedValue(makeSub());

    const result = await service.create(
      10,
      { triggerType: TriggerType.BIRTHDAY },
      1,
      99,
    );
    expect(result.ativo).toBe(true);
    expect(prisma.triggerSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ativo: true }),
      }),
    );
  });

  it('S.2: create → 404 if campaign not found', async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);
    await expect(
      service.create(10, { triggerType: TriggerType.BIRTHDAY }, 1, 99),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('S.3: create → 400 if duplicate triggerType for same campaign', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 10 });
    prisma.triggerSubscription.findUnique.mockResolvedValue(makeSub());
    await expect(
      service.create(10, { triggerType: TriggerType.BIRTHDAY }, 1, 99),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('S.4: create → 400 if NO_ORDER_X_DAYS config.days is invalid', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 10 });
    prisma.triggerSubscription.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        10,
        {
          triggerType: TriggerType.NO_ORDER_X_DAYS,
          triggerConfig: { days: -1 },
        },
        1,
        99,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // --- runNow ---

  it('S.5: runNow → handler matches 2 customers → dispatch called → dispatched=2', async () => {
    prisma.triggerSubscription.findFirst.mockResolvedValue(makeSub());
    handlers[TriggerType.BIRTHDAY].findMatches.mockResolvedValue([1, 2]);
    dispatch.dispatchToCustomers.mockResolvedValue({
      dispatchId: 5,
      sentCount: 2,
      failedCount: 0,
    });

    const result = await service.runNow(1, 1, 99);
    expect(result.dispatched).toBe(2);
    expect(dispatch.dispatchToCustomers).toHaveBeenCalledWith(10, [1, 2]);
  });

  it('S.6: runNow → handler returns [] → dispatch NOT called → dispatched=0', async () => {
    prisma.triggerSubscription.findFirst.mockResolvedValue(makeSub());
    handlers[TriggerType.BIRTHDAY].findMatches.mockResolvedValue([]);

    const result = await service.runNow(1, 1, 99);
    expect(result.dispatched).toBe(0);
    expect(dispatch.dispatchToCustomers).not.toHaveBeenCalled();
  });

  it('S.7: runNow FIRST_ORDER_PLACED → customer.updateMany called after dispatch', async () => {
    const sub = makeSub({ triggerType: TriggerType.FIRST_ORDER_PLACED });
    prisma.triggerSubscription.findFirst.mockResolvedValue(sub);
    handlers[TriggerType.FIRST_ORDER_PLACED].findMatches.mockResolvedValue([
      55,
    ]);
    dispatch.dispatchToCustomers.mockResolvedValue({
      dispatchId: 7,
      sentCount: 1,
      failedCount: 0,
    });
    prisma.customer.updateMany.mockResolvedValue({ count: 1 });

    await service.runNow(1, 1, 99);

    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [55] } },
      data: { firstOrderTriggered: true },
    });
  });

  // --- findOne ---

  it('S.8: findOne → 404 if not found', async () => {
    prisma.triggerSubscription.findFirst.mockResolvedValue(null);
    await expect(service.findOne(99, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // --- update ---

  it('S.9: update ativo=false → updated record returned', async () => {
    prisma.triggerSubscription.findFirst.mockResolvedValue(makeSub());
    prisma.triggerSubscription.update.mockResolvedValue(
      makeSub({ ativo: false }),
    );
    const result = await service.update(1, { ativo: false }, 1, 99);
    expect(result.ativo).toBe(false);
  });

  // --- remove ---

  it('S.10: remove → deleted=true returned', async () => {
    prisma.triggerSubscription.findFirst.mockResolvedValue(makeSub());
    prisma.triggerSubscription.delete.mockResolvedValue(makeSub());
    const result = await service.remove(1, 1, 99);
    expect(result).toEqual({ deleted: true });
  });
});
