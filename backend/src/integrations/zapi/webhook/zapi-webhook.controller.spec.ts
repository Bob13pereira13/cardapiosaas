/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZApiWebhookController } from './zapi-webhook.controller';
import { ZApiWebhookService } from './zapi-webhook.service';

const MATCHED = { received: true, matched: true };
const UNMATCHED = { received: true, matched: false };

describe('ZApiWebhookController', () => {
  let controller: ZApiWebhookController;
  let service: jest.Mocked<ZApiWebhookService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZApiWebhookController],
      providers: [
        {
          provide: ZApiWebhookService,
          useValue: { processEvent: jest.fn().mockResolvedValue(MATCHED) },
        },
      ],
    }).compile();

    controller = module.get(ZApiWebhookController);
    service = module.get(ZApiWebhookService);
    // Ensure no token enforced in unit tests
    (controller as unknown as { webhookToken: string }).webhookToken = '';
  });

  it('1. DeliveryCallback → processEvent called with DELIVERED', async () => {
    const result = await controller.handleZapi(
      {},
      { type: 'DeliveryCallback', messageId: 'mock-abc123' },
    );
    expect(service.processEvent).toHaveBeenCalledWith(
      'DELIVERED',
      'mock-abc123',
    );
    expect(result).toEqual(MATCHED);
  });

  it('2. ReadReceipt → processEvent called with READ', async () => {
    await controller.handleZapi(
      {},
      { type: 'ReadReceipt', messageId: 'mock-def456' },
    );
    expect(service.processEvent).toHaveBeenCalledWith('READ', 'mock-def456');
  });

  it('3. Unknown type → matched:false, processEvent not called', async () => {
    const result = await controller.handleZapi(
      {},
      { type: 'UnknownEvent', messageId: 'mock-xyz' },
    );
    expect(service.processEvent).not.toHaveBeenCalled();
    expect(result).toEqual(UNMATCHED);
  });

  it('4. Missing messageId → matched:false', async () => {
    const result = await controller.handleZapi(
      {},
      { type: 'DeliveryCallback' },
    );
    expect(service.processEvent).not.toHaveBeenCalled();
    expect(result).toEqual(UNMATCHED);
  });

  it('5. zaapId fallback when messageId absent', async () => {
    await controller.handleZapi(
      {},
      { type: 'DeliveryCallback', zaapId: 'mock-zaap-001' },
    );
    expect(service.processEvent).toHaveBeenCalledWith(
      'DELIVERED',
      'mock-zaap-001',
    );
  });

  it('6. token enforced → wrong token throws 401', async () => {
    (controller as unknown as { webhookToken: string }).webhookToken =
      'secret-token';
    await expect(
      controller.handleZapi(
        { 'x-zapi-token': 'wrong' },
        { type: 'DeliveryCallback', messageId: 'x' },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('7. token enforced → correct token passes', async () => {
    (controller as unknown as { webhookToken: string }).webhookToken =
      'secret-token';
    const result = await controller.handleZapi(
      { 'x-zapi-token': 'secret-token' },
      { type: 'DeliveryCallback', messageId: 'mock-ok' },
    );
    expect(result).toEqual(MATCHED);
  });

  it('8. case-insensitive type parsing', async () => {
    await controller.handleZapi(
      {},
      { type: 'DELIVERYCALLBACK', messageId: 'mock-upper' },
    );
    expect(service.processEvent).toHaveBeenCalledWith(
      'DELIVERED',
      'mock-upper',
    );
  });
});
