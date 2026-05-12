/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AgendamentoTipo,
  CampaignChannel,
  CampaignStatus,
  CampaignTipo,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from './campaigns.service';

const RESTAURANT_ID = 1;
const ACCOUNT_ID = 10;

const audienceFixture = {
  id: 1,
  restaurantId: RESTAURANT_ID,
  nome: 'VIP',
  deletedAt: null,
};
const couponFixture = {
  id: 5,
  restaurantId: RESTAURANT_ID,
  code: 'VIP10',
  active: true,
};

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  restaurantId: RESTAURANT_ID,
  nome: 'Test Campaign',
  descricao: null,
  tipo: CampaignTipo.MENSAGEM,
  channel: CampaignChannel.WHATSAPP,
  status: CampaignStatus.DRAFT,
  agendamentoTipo: AgendamentoTipo.IMMEDIATE,
  scheduledAt: null,
  recurringCron: null,
  recurringEndsAt: null,
  audienceId: 1,
  couponId: null,
  templateBody: 'Olá {nome}!',
  statsTotal: 0,
  statsSent: 0,
  statsFailed: 0,
  statsDelivered: 0,
  statsRead: 0,
  statsConverted: 0,
  createdByAccountId: ACCOUNT_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  audience: { id: 1, nome: 'VIP' },
  coupon: null,
  ...overrides,
});

const baseDto = {
  nome: 'Test',
  tipo: CampaignTipo.MENSAGEM,
  templateBody: 'Olá {nome}!',
  agendamentoTipo: AgendamentoTipo.IMMEDIATE,
  audienceId: 1,
};

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: PrismaService,
          useValue: {
            audience: {
              findFirst: jest.fn().mockResolvedValue(audienceFixture),
            },
            coupon: {
              findFirst: jest.fn().mockResolvedValue(couponFixture),
            },
            campaign: {
              create: jest.fn().mockResolvedValue(makeCampaign()),
              findFirst: jest.fn().mockResolvedValue(makeCampaign()),
              findMany: jest.fn().mockResolvedValue([makeCampaign()]),
              count: jest.fn().mockResolvedValue(1),
              update: jest.fn().mockResolvedValue(makeCampaign()),
              delete: jest.fn().mockResolvedValue(makeCampaign()),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(CampaignsService);
    prisma = module.get(PrismaService);

    (prisma.$transaction as jest.Mock).mockImplementation((arg) => {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg.map((p: Promise<unknown>) => p));
    });
  });

  describe('create()', () => {
    it('1. MENSAGEM válida retorna campaign com status DRAFT', async () => {
      const result = await service.create(baseDto, RESTAURANT_ID, ACCOUNT_ID);
      expect(result.status).toBe(CampaignStatus.DRAFT);
      expect(prisma.campaign.create).toHaveBeenCalled();
    });

    it('2. CUPOM_GENERICO sem couponId → BadRequestException', async () => {
      await expect(
        service.create(
          { ...baseDto, tipo: CampaignTipo.CUPOM_GENERICO },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('3. CUPOM_GENERICO com couponId válido → 201', async () => {
      (prisma.campaign.create as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ tipo: CampaignTipo.CUPOM_GENERICO, couponId: 5 }),
      );
      const result = await service.create(
        { ...baseDto, tipo: CampaignTipo.CUPOM_GENERICO, couponId: 5 },
        RESTAURANT_ID,
        ACCOUNT_ID,
      );
      expect(result.tipo).toBe(CampaignTipo.CUPOM_GENERICO);
    });

    it('4. CUPOM_UNICO sem couponId → 201 (válido)', async () => {
      (prisma.campaign.create as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ tipo: CampaignTipo.CUPOM_UNICO }),
      );
      const result = await service.create(
        { ...baseDto, tipo: CampaignTipo.CUPOM_UNICO },
        RESTAURANT_ID,
        ACCOUNT_ID,
      );
      expect(result.tipo).toBe(CampaignTipo.CUPOM_UNICO);
    });

    it('5. MENSAGEM com couponId → BadRequestException', async () => {
      await expect(
        service.create(
          { ...baseDto, tipo: CampaignTipo.MENSAGEM, couponId: 5 },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. SCHEDULED sem scheduledAt → BadRequestException', async () => {
      await expect(
        service.create(
          { ...baseDto, agendamentoTipo: AgendamentoTipo.SCHEDULED },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. SCHEDULED com scheduledAt no passado → BadRequestException', async () => {
      await expect(
        service.create(
          {
            ...baseDto,
            agendamentoTipo: AgendamentoTipo.SCHEDULED,
            scheduledAt: '2020-01-01T00:00:00Z',
          },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. RECURRING com cron inválido → BadRequestException', async () => {
      await expect(
        service.create(
          {
            ...baseDto,
            agendamentoTipo: AgendamentoTipo.RECURRING,
            recurringCron: 'abc xyz',
          },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('9. RECURRING com cron válido "0 18 * * 5" → 201', async () => {
      (prisma.campaign.create as jest.Mock).mockResolvedValueOnce(
        makeCampaign({
          agendamentoTipo: AgendamentoTipo.RECURRING,
          recurringCron: '0 18 * * 5',
        }),
      );
      const result = await service.create(
        {
          ...baseDto,
          agendamentoTipo: AgendamentoTipo.RECURRING,
          recurringCron: '0 18 * * 5',
        },
        RESTAURANT_ID,
        ACCOUNT_ID,
      );
      expect(result.recurringCron).toBe('0 18 * * 5');
    });

    it('10. audienceId de outro restaurant → NotFoundException', async () => {
      (prisma.audience.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.create(baseDto, RESTAURANT_ID, ACCOUNT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('11. couponId de outro restaurant → NotFoundException', async () => {
      (prisma.coupon.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.create(
          { ...baseDto, tipo: CampaignTipo.CUPOM_GENERICO, couponId: 999 },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('12. PATCH em DRAFT → success', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ status: CampaignStatus.DRAFT }),
      );
      (prisma.campaign.update as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ nome: 'Updated' }),
      );
      const result = await service.update(
        1,
        { nome: 'Updated' },
        RESTAURANT_ID,
        ACCOUNT_ID,
      );
      expect(prisma.campaign.update).toHaveBeenCalled();
      expect(result.nome).toBe('Updated');
    });

    it('13. PATCH em SCHEDULED alterando templateBody → BadRequestException', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ status: CampaignStatus.SCHEDULED }),
      );
      await expect(
        service.update(
          1,
          { templateBody: 'novo texto' },
          RESTAURANT_ID,
          ACCOUNT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete()', () => {
    it('14. DELETE em DRAFT → { deleted: true }', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ status: CampaignStatus.DRAFT }),
      );
      const result = await service.delete(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(result).toEqual({ deleted: true });
      expect(prisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('15. DELETE em SCHEDULED → BadRequestException', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce(
        makeCampaign({ status: CampaignStatus.SCHEDULED }),
      );
      await expect(
        service.delete(1, RESTAURANT_ID, ACCOUNT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
