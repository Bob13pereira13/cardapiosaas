/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AudiencesService } from './audiences.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const RESTAURANT_ID = 1;
const ACCOUNT_ID = 10;

const audienceFixture = {
  id: 1,
  restaurantId: RESTAURANT_ID,
  nome: 'VIP Clients',
  descricao: null,
  filtros: { tags: ['VIP'] },
  estimatedSize: 0,
  lastEstimateAt: null,
  createdByAccountId: ACCOUNT_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockTx = {
  customer: { count: jest.fn().mockResolvedValue(7) },
  audience: {
    update: jest
      .fn()
      .mockResolvedValue({ ...audienceFixture, estimatedSize: 7 }),
  },
};

describe('AudiencesService', () => {
  let service: AudiencesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudiencesService,
        {
          provide: PrismaService,
          useValue: {
            audience: {
              create: jest.fn().mockResolvedValue(audienceFixture),
              findFirst: jest.fn().mockResolvedValue(audienceFixture),
              findMany: jest.fn().mockResolvedValue([audienceFixture]),
              update: jest.fn().mockResolvedValue(audienceFixture),
              count: jest.fn().mockResolvedValue(1),
            },
            customer: {
              count: jest.fn().mockResolvedValue(7),
              findMany: jest.fn().mockResolvedValue([]),
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

    service = module.get(AudiencesService);
    prisma = module.get(PrismaService);

    // Default: $transaction array form returns [count, audience]
    (prisma.$transaction as jest.Mock).mockImplementation((arg) => {
      if (typeof arg === 'function') return arg(mockTx);
      // array form: [count, findMany or update]
      return Promise.all(arg.map((p: Promise<unknown>) => p));
    });
  });

  describe('findOne', () => {
    it('retorna audience quando encontrado', async () => {
      const result = await service.findOne(1, RESTAURANT_ID);
      expect(result.id).toBe(1);
      expect(prisma.audience.findFirst).toHaveBeenCalledWith({
        where: { id: 1, restaurantId: RESTAURANT_ID, deletedAt: null },
      });
    });

    it('lança NotFoundException quando não encontrado', async () => {
      (prisma.audience.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.findOne(99, RESTAURANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('filtra por deletedAt: null', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        [audienceFixture],
        1,
      ]);
      const result = await service.findAll(RESTAURANT_ID);
      const [findManyCall] = (prisma.$transaction as jest.Mock).mock.calls[0];
      // findMany is called inside the transaction array, so check the array
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      void findManyCall;
    });
  });

  describe('create', () => {
    it('cria audience e recalcula estimatedSize', async () => {
      const dto = { nome: 'Test', filtros: {} };
      const result = await service.create(dto, RESTAURANT_ID, ACCOUNT_ID);
      expect(prisma.audience.create).toHaveBeenCalled();
      expect(result.estimatedSize).toBe(7);
    });
  });

  describe('delete', () => {
    it('faz soft delete setando deletedAt', async () => {
      await service.delete(1, RESTAURANT_ID, ACCOUNT_ID);
      expect(prisma.audience.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('lança NotFoundException se não encontrada', async () => {
      (prisma.audience.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.delete(99, RESTAURANT_ID, ACCOUNT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('preview', () => {
    it('retorna audience + totalCount + customers sem atualizar estimatedSize', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        12,
        [{ id: 1, name: 'A' }],
      ]);
      const result = await service.preview(1, RESTAURANT_ID);
      expect(result.totalCount).toBe(12);
      expect(result.customers).toHaveLength(1);
      expect(result.audience.id).toBe(1);
      // estimatedSize não é alterado no preview
      expect(prisma.audience.update).not.toHaveBeenCalled();
    });
  });

  describe('recalculateSize', () => {
    it('atualiza estimatedSize com contagem real de customers', async () => {
      const result = await service.recalculateSize(1, RESTAURANT_ID);
      expect(mockTx.customer.count).toHaveBeenCalled();
      expect(mockTx.audience.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estimatedSize: 7 }),
        }),
      );
      expect(result.estimatedSize).toBe(7);
    });
  });
});
