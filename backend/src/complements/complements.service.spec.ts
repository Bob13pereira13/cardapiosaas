import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ComplementLink,
  ComplementPriceMode,
  ComplementSelectionRule,
  ComplementVisibility,
  OptionStockStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ComplementsService } from './complements.service';

const mockLinks = [ComplementLink.DELIVERY];

const mockComplementRow = {
  id: 1,
  restaurantId: 10,
  name: 'Molhos',
  description: null,
  selectionRule: ComplementSelectionRule.SINGLE,
  minSelections: 0,
  maxSelections: 1,
  availableLinks: mockLinks,
  visibility: ComplementVisibility.VISIBLE,
  priceMode: ComplementPriceMode.SUM_OF_SELECTED,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  complementOptions: [],
  _count: { productComplements: 0 },
  productComplements: [],
};

const mockPrisma = {
  complement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  complementOption: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productComplement: {
    count: jest.fn(),
  },
  option: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ComplementsService', () => {
  let service: ComplementsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
      return (arg as (tx: unknown) => Promise<unknown>)(mockPrisma);
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ComplementsService>(ComplementsService);
  });

  describe('list', () => {
    it('returns paginated response with items', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockComplementRow], 1]);
      const result = await service.list(10, {
        page: 1,
        limit: 20,
        includeUsage: true,
      });
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].usedInProducts).toBe(0);
    });

    it('does not expose usedInProducts when includeUsage=false', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockComplementRow], 1]);
      const result = await service.list(10, { page: 1, limit: 20 });
      expect(result.data[0].usedInProducts).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(null);
      await expect(service.findOne(10, 1)).rejects.toThrow(NotFoundException);
    });

    it('returns complement with productsUsing', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue({
        ...mockComplementRow,
        _count: { productComplements: 2 },
        productComplements: [
          { product: { id: 5, nome: 'Pizza' } },
          { product: { id: 6, nome: 'Hamburguer' } },
        ],
      });
      const result = await service.findOne(10, 1);
      expect(result.usedInProducts).toBe(2);
      expect(result.productsUsing).toHaveLength(2);
      expect(result.productsUsing![0].name).toBe('Pizza');
    });
  });

  describe('create', () => {
    it('creates complement without options', async () => {
      mockPrisma.complement.create.mockResolvedValue({
        id: 2,
        restaurantId: 10,
      });
      mockPrisma.complement.findFirst.mockResolvedValue({
        ...mockComplementRow,
        id: 2,
      });
      const result = await service.create(10, {
        name: 'Molhos',
        selectionRule: ComplementSelectionRule.SINGLE,
        availableLinks: mockLinks,
      });
      expect(result.id).toBe(2);
      expect(mockPrisma.complementOption.createMany).not.toHaveBeenCalled();
    });

    it('creates complement with nested options in transaction', async () => {
      mockPrisma.option.findMany.mockResolvedValue([{ id: 5 }, { id: 6 }]);
      mockPrisma.complement.create.mockResolvedValue({
        id: 3,
        restaurantId: 10,
      });
      mockPrisma.complementOption.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.complement.findFirst.mockResolvedValue({
        ...mockComplementRow,
        id: 3,
      });

      await service.create(10, {
        name: 'Extras',
        selectionRule: ComplementSelectionRule.MULTI_NO_REPEAT,
        availableLinks: mockLinks,
        maxSelections: 3,
        options: [{ optionId: 5, extraPrice: 2.5 }, { optionId: 6 }],
      });

      expect(mockPrisma.complementOption.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ optionId: 5, extraPrice: 2.5 }),
          expect.objectContaining({ optionId: 6, extraPrice: 0 }),
        ]),
      });
    });

    it('throws 422 when optionId belongs to another restaurant', async () => {
      mockPrisma.option.findMany.mockResolvedValue([{ id: 5 }]); // only 1 found, 2 requested
      await expect(
        service.create(10, {
          name: 'Test',
          selectionRule: ComplementSelectionRule.SINGLE,
          availableLinks: mockLinks,
          options: [{ optionId: 5 }, { optionId: 99 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('coerces maxSelections to 1 when selectionRule=SINGLE', async () => {
      mockPrisma.complement.create.mockResolvedValue({
        id: 4,
        restaurantId: 10,
      });
      mockPrisma.complement.findFirst.mockResolvedValue({
        ...mockComplementRow,
        id: 4,
        maxSelections: 1,
      });

      await service.create(10, {
        name: 'Único',
        selectionRule: ComplementSelectionRule.SINGLE,
        availableLinks: mockLinks,
        maxSelections: 3,
      });

      expect(mockPrisma.complement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maxSelections: 1 }),
        }),
      );
    });

    it('throws 400 when minSelections > maxSelections', async () => {
      await expect(
        service.create(10, {
          name: 'Bad',
          selectionRule: ComplementSelectionRule.MULTI_NO_REPEAT,
          availableLinks: mockLinks,
          minSelections: 5,
          maxSelections: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 400 when availableLinks is empty', async () => {
      await expect(
        service.create(10, {
          name: 'Bad',
          selectionRule: ComplementSelectionRule.SINGLE,
          availableLinks: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('throws 422 when complement is in use', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(mockComplementRow);
      mockPrisma.productComplement.count.mockResolvedValue(3);
      await expect(service.softDelete(10, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('sets deletedAt and isActive=false when not in use', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(mockComplementRow);
      mockPrisma.productComplement.count.mockResolvedValue(0);
      mockPrisma.complement.update.mockResolvedValue({});
      const result = await service.softDelete(10, 1);
      expect(result).toEqual({ ok: true });
      expect(mockPrisma.complement.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
    });
  });

  describe('addOption', () => {
    it('throws ConflictException on duplicate option', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(mockComplementRow);
      mockPrisma.option.findFirst.mockResolvedValue({ id: 5 });
      const err = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      mockPrisma.complementOption.create.mockRejectedValue(err);
      await expect(service.addOption(10, 1, { optionId: 5 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when option does not belong to restaurant', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(mockComplementRow);
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.addOption(10, 1, { optionId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateComplementOption', () => {
    it('updates pivot fields and returns updated complement', async () => {
      mockPrisma.complement.findFirst
        .mockResolvedValueOnce(mockComplementRow)
        .mockResolvedValueOnce(mockComplementRow);
      mockPrisma.complementOption.update.mockResolvedValue({});
      const result = await service.updateComplementOption(10, 1, 5, {
        extraPrice: 3.0,
        isLocked: true,
      });
      expect(mockPrisma.complementOption.update).toHaveBeenCalledWith({
        where: { complementId_optionId: { complementId: 1, optionId: 5 } },
        data: { extraPrice: 3.0, isLocked: true },
      });
      expect(result).toBeDefined();
    });
  });

  describe('reorderOptions', () => {
    it('throws 422 when an optionId is not in the complement', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(mockComplementRow);
      mockPrisma.complementOption.findMany.mockResolvedValue([
        { optionId: 5 },
        { optionId: 6 },
      ]);
      await expect(
        service.reorderOptions(10, 1, { optionIds: [5, 99] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when an existing optionId is missing from the list', async () => {
      mockPrisma.complement.findFirst.mockResolvedValue(mockComplementRow);
      mockPrisma.complementOption.findMany.mockResolvedValue([
        { optionId: 5 },
        { optionId: 6 },
      ]);
      await expect(
        service.reorderOptions(10, 1, { optionIds: [5] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('updates sortOrder for each option in order', async () => {
      mockPrisma.complement.findFirst
        .mockResolvedValueOnce(mockComplementRow)
        .mockResolvedValueOnce(mockComplementRow);
      mockPrisma.complementOption.findMany.mockResolvedValue([
        { optionId: 5 },
        { optionId: 6 },
      ]);
      mockPrisma.complementOption.update.mockResolvedValue({});

      await service.reorderOptions(10, 1, { optionIds: [6, 5] });

      expect(mockPrisma.complementOption.update).toHaveBeenCalledWith({
        where: { complementId_optionId: { complementId: 1, optionId: 6 } },
        data: { sortOrder: 0 },
      });
      expect(mockPrisma.complementOption.update).toHaveBeenCalledWith({
        where: { complementId_optionId: { complementId: 1, optionId: 5 } },
        data: { sortOrder: 1 },
      });
    });
  });
});
