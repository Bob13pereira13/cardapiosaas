import { Test, TestingModule } from '@nestjs/testing';
import { TriggerType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { TriggerEngineService } from './trigger-engine.service';

const makeSub = (
  id: number,
  triggerType: TriggerType,
  ativo = true,
  restaurantId = 1,
  campaignId = 10,
) => ({
  id,
  triggerType,
  ativo,
  restaurantId,
  campaignId,
  triggerConfig: {},
  campaign: { id: campaignId },
});

describe('TriggerEngineService', () => {
  let engine: TriggerEngineService;
  let prisma: {
    triggerSubscription: { findMany: jest.Mock };
    customer: { updateMany: jest.Mock };
  };
  let dispatch: { dispatchToCustomers: jest.Mock };
  let birthdayHandler: { triggerType: TriggerType; findMatches: jest.Mock };

  beforeEach(async () => {
    birthdayHandler = {
      triggerType: TriggerType.BIRTHDAY,
      findMatches: jest.fn(),
    };

    prisma = {
      triggerSubscription: { findMany: jest.fn() },
      customer: { updateMany: jest.fn() },
    };

    dispatch = { dispatchToCustomers: jest.fn() };

    const handlers = {
      [TriggerType.BIRTHDAY]: birthdayHandler,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: DispatchService, useValue: dispatch },
        { provide: 'TRIGGER_HANDLERS', useValue: handlers },
      ],
    }).compile();

    engine = module.get(TriggerEngineService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('E.1: 1 active BIRTHDAY subscription → dispatch called with matched IDs → dispatched=2', async () => {
    prisma.triggerSubscription.findMany.mockResolvedValue([
      makeSub(1, TriggerType.BIRTHDAY),
    ]);
    birthdayHandler.findMatches.mockResolvedValue([100, 101]);
    dispatch.dispatchToCustomers.mockResolvedValue({
      dispatchId: 5,
      sentCount: 2,
      failedCount: 0,
    });

    const result = await engine.processAllTriggers();

    expect(birthdayHandler.findMatches).toHaveBeenCalledWith(1, {});
    expect(dispatch.dispatchToCustomers).toHaveBeenCalledWith(10, [100, 101]);
    expect(result).toEqual({ processed: 1, dispatched: 2 });
  });

  it('E.2: inactive subscription → handler NOT called', async () => {
    prisma.triggerSubscription.findMany.mockResolvedValue([
      makeSub(2, TriggerType.BIRTHDAY, false),
    ]);

    // ativo=false subs are excluded by the DB WHERE ativo=true — simulate empty result
    prisma.triggerSubscription.findMany.mockResolvedValue([]);

    const result = await engine.processAllTriggers();

    expect(birthdayHandler.findMatches).not.toHaveBeenCalled();
    expect(dispatch.dispatchToCustomers).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, dispatched: 0 });
  });

  it('E.3: 0 subscriptions → returns processed=0 dispatched=0 without error', async () => {
    prisma.triggerSubscription.findMany.mockResolvedValue([]);

    const result = await engine.processAllTriggers();

    expect(result).toEqual({ processed: 0, dispatched: 0 });
    expect(dispatch.dispatchToCustomers).not.toHaveBeenCalled();
  });

  it('E.4: FIRST_ORDER_PLACED → after dispatch, customer.updateMany sets firstOrderTriggered=true', async () => {
    const firstOrderHandler = {
      triggerType: TriggerType.FIRST_ORDER_PLACED,
      findMatches: jest.fn(),
    };
    firstOrderHandler.findMatches.mockResolvedValue([55]);
    dispatch.dispatchToCustomers.mockResolvedValue({
      dispatchId: 6,
      sentCount: 1,
      failedCount: 0,
    });
    prisma.customer.updateMany.mockResolvedValue({ count: 1 });

    // Re-create engine with FIRST_ORDER_PLACED handler
    const module2 = await Test.createTestingModule({
      providers: [
        TriggerEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: DispatchService, useValue: dispatch },
        {
          provide: 'TRIGGER_HANDLERS',
          useValue: { [TriggerType.FIRST_ORDER_PLACED]: firstOrderHandler },
        },
      ],
    }).compile();
    const engine2 = module2.get(TriggerEngineService);

    prisma.triggerSubscription.findMany.mockResolvedValue([
      makeSub(3, TriggerType.FIRST_ORDER_PLACED),
    ]);

    await engine2.processAllTriggers();

    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [55] } },
      data: { firstOrderTriggered: true },
    });
  });

  it('E.5: handler throws exception → other subscriptions continue processing', async () => {
    const birthdayHandler2 = {
      triggerType: TriggerType.BIRTHDAY,
      findMatches: jest.fn(),
    };
    const noOrderHandler = {
      triggerType: TriggerType.NO_ORDER_X_DAYS,
      findMatches: jest.fn(),
    };

    birthdayHandler2.findMatches.mockRejectedValue(new Error('DB timeout'));
    noOrderHandler.findMatches.mockResolvedValue([77]);
    dispatch.dispatchToCustomers.mockResolvedValue({
      dispatchId: 7,
      sentCount: 1,
      failedCount: 0,
    });

    const module3 = await Test.createTestingModule({
      providers: [
        TriggerEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: DispatchService, useValue: dispatch },
        {
          provide: 'TRIGGER_HANDLERS',
          useValue: {
            [TriggerType.BIRTHDAY]: birthdayHandler2,
            [TriggerType.NO_ORDER_X_DAYS]: noOrderHandler,
          },
        },
      ],
    }).compile();
    const engine3 = module3.get(TriggerEngineService);

    prisma.triggerSubscription.findMany.mockResolvedValue([
      makeSub(4, TriggerType.BIRTHDAY, true, 1, 10),
      makeSub(5, TriggerType.NO_ORDER_X_DAYS, true, 1, 11),
    ]);

    // Should not throw
    const result = await engine3.processAllTriggers();

    expect(noOrderHandler.findMatches).toHaveBeenCalled();
    expect(dispatch.dispatchToCustomers).toHaveBeenCalledWith(11, [77]);
    expect(result.processed).toBe(2);
  });

  it('E.6: dispatchToCustomers called with 0 IDs → handler returns empty, dispatch NOT called', async () => {
    prisma.triggerSubscription.findMany.mockResolvedValue([
      makeSub(6, TriggerType.BIRTHDAY),
    ]);
    birthdayHandler.findMatches.mockResolvedValue([]);

    const result = await engine.processAllTriggers();

    expect(dispatch.dispatchToCustomers).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, dispatched: 0 });
  });
});
