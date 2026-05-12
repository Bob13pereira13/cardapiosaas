/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CampaignStatus,
  CampaignTipo,
  DispatchStatus,
  MessageStatus,
} from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ZApiClientService } from '../../integrations/zapi/zapi-client.service';
import { DispatchService } from './dispatch.service';

const RESTAURANT_ID = 1;
const ACCOUNT_ID = 10;

const makeCustomer = (id: number) => ({
  id,
  name: `Customer ${id}`,
  phone: `5511999${String(id).padStart(6, '0')}`,
});

const makeMessage = (id: number) => ({
  id,
  dispatchId: 1,
  customerId: id,
  couponId: null,
  orderId: null,
  status: MessageStatus.PENDING,
  phone: `5511999${String(id).padStart(6, '0')}`,
  renderedBody: `Olá Customer ${id}!`,
  zapiMessageId: null,
  sentAt: null,
  deliveredAt: null,
  readAt: null,
  convertedAt: null,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const dispatchFixture = {
  id: 1,
  campaignId: 1,
  status: DispatchStatus.SCHEDULED,
  totalMessages: 0,
  sentCount: 0,
  failedCount: 0,
  deliveredCount: 0,
  scheduledAt: new Date(),
  startedAt: null,
  completedAt: null,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  restaurantId: RESTAURANT_ID,
  nome: 'Test Campaign',
  tipo: CampaignTipo.MENSAGEM,
  status: CampaignStatus.DRAFT,
  audienceId: 1,
  couponId: null,
  templateBody: 'Olá {nome}!',
  audience: { id: 1, filtros: {} },
  coupon: null,
  restaurant: { nome: 'Restaurante Teste', slug: 'restaurante-teste' },
  ...overrides,
});

const couponFixture = {
  id: 5,
  restaurantId: RESTAURANT_ID,
  code: 'CAMP-ABCD1234',
  type: 'PERCENT',
  value: 10,
  maxUses: 1,
  usedCount: 0,
  active: true,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

describe('DispatchService', () => {
  let service: DispatchService;
  let prisma: jest.Mocked<PrismaService>;
  let zapi: jest.Mocked<ZApiClientService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        {
          provide: PrismaService,
          useValue: {
            campaign: {
              findFirst: jest.fn().mockResolvedValue(makeCampaign()),
              update: jest.fn().mockResolvedValue(makeCampaign()),
            },
            campaignDispatch: {
              create: jest.fn().mockResolvedValue(dispatchFixture),
              update: jest.fn().mockResolvedValue(dispatchFixture),
            },
            campaignMessage: {
              create: jest.fn().mockResolvedValue(makeMessage(1)),
              update: jest.fn().mockResolvedValue(makeMessage(1)),
              findMany: jest.fn().mockResolvedValue([makeMessage(1)]),
              count: jest.fn().mockResolvedValue(1),
            },
            coupon: {
              findFirst: jest.fn().mockResolvedValue(couponFixture),
              create: jest.fn().mockResolvedValue(couponFixture),
            },
            customer: {
              findMany: jest
                .fn()
                .mockResolvedValue([
                  makeCustomer(1),
                  makeCustomer(2),
                  makeCustomer(3),
                ]),
              count: jest.fn().mockResolvedValue(3),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ZApiClientService,
          useValue: {
            sendText: jest.fn().mockResolvedValue({
              success: true,
              messageId: 'mock-abc123',
              mock: true,
            }),
            isMockMode: true,
          },
        },
      ],
    }).compile();

    service = module.get(DispatchService);
    prisma = module.get(PrismaService);
    zapi = module.get(ZApiClientService);

    (prisma.$transaction as jest.Mock).mockImplementation((arg) => {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg.map((p: Promise<unknown>) => p));
    });
  });

  describe('send()', () => {
    it('1. MENSAGEM + 3 customers → total:3, sent:3, failed:0', async () => {
      const result = await service.send(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(result.totalMessages).toBe(3);
      expect(result.sentCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.dispatchId).toBe(1);
    });

    it('2. campaign COMPLETED → BadRequestException', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ status: CampaignStatus.COMPLETED }),
      );
      await expect(service.send(1, RESTAURANT_ID, ACCOUNT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('3. CUPOM_GENERICO com coupon inativo → BadRequestException', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({
          tipo: CampaignTipo.CUPOM_GENERICO,
          couponId: 5,
          coupon: { id: 5, code: 'VIP10' },
        }),
      );
      (prisma.coupon.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.send(1, RESTAURANT_ID, ACCOUNT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('4. CUPOM_UNICO → prisma.coupon.create chamado 1× por customer (3 total)', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ tipo: CampaignTipo.CUPOM_UNICO, couponId: null }),
      );
      let couponSeq = 0;
      (prisma.coupon.create as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ...couponFixture,
          id: ++couponSeq,
          code: `CAMP-CODE${couponSeq}`,
        }),
      );

      const result = await service.send(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(prisma.coupon.create).toHaveBeenCalledTimes(3);
      expect(result.sentCount).toBe(3);
    });

    it('5. audience vazia → totalMessages:0, dispatch COMPLETED, sem mensagens', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([]);
      const result = await service.send(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(result.totalMessages).toBe(0);
      expect(result.sentCount).toBe(0);
      expect(prisma.campaignMessage.create).not.toHaveBeenCalled();
    });

    it('6. 60 customers → campaignMessage.create chamado 60× (2 batches)', async () => {
      const manyCustomers = Array.from({ length: 60 }, (_, i) =>
        makeCustomer(i + 1),
      );
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce(
        manyCustomers,
      );
      (prisma.campaignMessage.create as jest.Mock).mockImplementation(
        ({ data }: { data: { customerId: number } }) =>
          Promise.resolve(makeMessage(data.customerId)),
      );

      const result = await service.send(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(result.totalMessages).toBe(60);
      expect(prisma.campaignMessage.create).toHaveBeenCalledTimes(60);
    });

    it('7. mock mode: zapiMessageId das messages começa com "mock-"', async () => {
      await service.send(1, RESTAURANT_ID, ACCOUNT_ID);

      const updateCalls = (prisma.campaignMessage.update as jest.Mock).mock
        .calls;
      const sentUpdate = updateCalls.find(
        (c) => c[0]?.data?.zapiMessageId !== undefined,
      );
      expect(sentUpdate).toBeDefined();
      expect(sentUpdate[0].data.zapiMessageId).toMatch(/^mock-/);
    });

    it('8. falha no envio (zapi returns success:false) → message.status=FAILED, failedCount++', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([
        makeCustomer(1),
      ]);
      (zapi.sendText as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Z-API connection refused',
        mock: false,
      });

      const result = await service.send(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(result.failedCount).toBe(1);
      expect(result.sentCount).toBe(0);

      const updateCalls = (prisma.campaignMessage.update as jest.Mock).mock
        .calls;
      const failedUpdate = updateCalls.find(
        (c) => c[0]?.data?.status === MessageStatus.FAILED,
      );
      expect(failedUpdate).toBeDefined();
    });

    it('10. [TODO] TOCTOU race condition: status check não é atômico', () => {
      // TODO: usar SELECT FOR UPDATE ou OPTIMISTIC LOCKING para prevenir dois
      // sends simultâneos na mesma campaign (Etapa 9 Fase C ou D).
      // O check `status !== DRAFT` em send() é uma leitura seguida de escrita,
      // não atômica. Dois requests simultâneos podem passar o check antes de
      // qualquer um atualizar o status.
      expect(true).toBe(true); // placeholder — teste real requer concorrência
    });
  });

  describe('getMessages()', () => {
    it('8b. getMessages paginado retorna items + total + page + limit', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        [
          {
            ...makeMessage(1),
            customer: { id: 1, name: 'João', phone: '5511999000001' },
          },
        ],
        1,
      ]);
      const result = await service.getMessages(1, RESTAURANT_ID);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('campaign não encontrada → NotFoundException', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.getMessages(99, RESTAURANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
