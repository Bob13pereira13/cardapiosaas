import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductLink, ProductOrderType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

const requiredLinks = [ProductLink.DELIVERY];
const requiredOrderTypes = [ProductOrderType.DELIVERY];

const mockProduct = {
  id: 1,
  restaurantId: 10,
  nome: 'Pizza',
  descricao: null,
  preco: 29.9,
  precoPromocional: null,
  tempoPreparo: null,
  sku: null,
  emDestaque: false,
  estoqueAtivo: false,
  estoque: 0,
  imagem: null,
  disponivel: true,
  displayOrder: 0,
  categoryId: null,
  disponibilidadeAtiva: false,
  disponibilidadeInicio: null,
  disponibilidadeFim: null,
  internalCode: 'INT-10-123-456',
  isPromotional: false,
  promoStartsAt: null,
  promoEndsAt: null,
  promoSchedule: null,
  costPrice: null,
  useTechSheet: false,
  codePdv: null,
  labelType: null,
  unitOfMeasure: 'UNIT',
  useCustomNameKds: false,
  customNameKds: null,
  hideObservations: false,
  hideQtyButtons: false,
  isNew: false,
  isAdult: false,
  isServiceFeeFree: false,
  orderTypes: requiredOrderTypes,
  availableLinks: requiredLinks,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: null,
  printAreas: [],
  productComplements: [],
};

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  productComplement: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productPrintArea: {
    createMany: jest.fn(),
  },
  productAvailability: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  complement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  productionSector: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAudit = { log: jest.fn() };

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
      return (arg as (tx: unknown) => Promise<unknown>)(mockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const baseDto = {
      nome: 'Pizza',
      preco: 29.9,
      orderTypes: requiredOrderTypes,
      availableLinks: requiredLinks,
    };

    it('creates product and auto-generates internalCode', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 2, restaurantId: 10 });
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      await service.create(10, undefined, baseDto);

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            internalCode: expect.stringMatching(/^INT-10-\d+-\d{3}$/),
          }),
        }),
      );
    });

    it('creates product with all 17 new fields', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 3, restaurantId: 10 });
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      await service.create(10, 1, {
        ...baseDto,
        isPromotional: true,
        precoPromocional: 19.9,
        promoStartsAt: '2026-06-01T00:00:00Z',
        promoEndsAt: '2026-06-30T23:59:59Z',
        costPrice: 10.0,
        useTechSheet: true,
        codePdv: 'PDV-001',
        labelType: 'HIGHLIGHT' as const,
        unitOfMeasure: 'UNIT' as const,
        useCustomNameKds: true,
        customNameKds: 'Pizza KDS',
        hideObservations: false,
        hideQtyButtons: false,
        isNew: true,
        isAdult: false,
        isServiceFeeFree: true,
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            costPrice: 10.0,
            labelType: 'HIGHLIGHT',
            isNew: true,
            isServiceFeeFree: true,
          }),
        }),
      );
    });

    it('throws 422 when printAreaIds belong to another restaurant', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 4, restaurantId: 10 });
      mockPrisma.productionSector.findMany.mockResolvedValue([{ id: 1 }]); // only 1 found, 2 requested

      await expect(
        service.create(10, undefined, { ...baseDto, printAreaIds: [1, 99] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when complementIds belong to another restaurant', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 5, restaurantId: 10 });
      mockPrisma.complement.findMany.mockResolvedValue([{ id: 10 }]); // only 1 found, 2 requested

      await expect(
        service.create(10, undefined, { ...baseDto, complementIds: [10, 99] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 400 when promoEndsAt is before promoStartsAt', async () => {
      await expect(
        service.create(10, undefined, {
          ...baseDto,
          promoStartsAt: '2026-06-30T00:00:00Z',
          promoEndsAt: '2026-06-01T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates complementIds in transaction with correct sortOrder', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 6, restaurantId: 10 });
      mockPrisma.complement.findMany.mockResolvedValue([
        { id: 20 },
        { id: 21 },
      ]);
      mockPrisma.productComplement.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      await service.create(10, undefined, {
        ...baseDto,
        complementIds: [20, 21],
      });

      expect(mockPrisma.productComplement.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ complementId: 20, sortOrder: 0 }),
          expect.objectContaining({ complementId: 21, sortOrder: 1 }),
        ]),
      });
    });
  });

  describe('update', () => {
    it('does not change internalCode', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct);
      mockPrisma.product.update.mockResolvedValue({});

      await service.update(10, 1, { nome: 'Nova Pizza' });

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            internalCode: expect.anything(),
          }),
        }),
      );
    });

    it('throws 400 when isPromotional=true without precoPromocional', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        precoPromocional: null,
      });

      await expect(
        service.update(10, 1, { isPromotional: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts isPromotional=true when precoPromocional is in dto', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ ...mockProduct, precoPromocional: null })
        .mockResolvedValueOnce(mockProduct);
      mockPrisma.product.update.mockResolvedValue({});

      await service.update(10, 1, {
        isPromotional: true,
        precoPromocional: 19.9,
      });

      expect(mockPrisma.product.update).toHaveBeenCalled();
    });

    it('throws 400 when updated promoEndsAt is before existing promoStartsAt', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        promoStartsAt: new Date('2026-06-20T00:00:00Z'),
      });

      await expect(
        service.update(10, 1, { promoEndsAt: '2026-06-10T00:00:00Z' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('marks deletedAt and sets disponivel=false without blocking', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.softDelete(10, 1, 99);

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date), disponivel: false },
      });
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(service.softDelete(10, 99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addComplement', () => {
    it('throws ConflictException on duplicate link', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.complement.findFirst.mockResolvedValue({ id: 5 });
      const err = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      mockPrisma.productComplement.create.mockRejectedValue(err);

      await expect(
        service.addComplement(10, 1, { complementId: 5 }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when complement does not belong to restaurant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.complement.findFirst.mockResolvedValue(null);

      await expect(
        service.addComplement(10, 1, { complementId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates link and returns product', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(mockProduct);
      mockPrisma.complement.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.productComplement.create.mockResolvedValue({});

      const result = await service.addComplement(10, 1, {
        complementId: 5,
        sortOrder: 2,
      });

      expect(mockPrisma.productComplement.create).toHaveBeenCalledWith({
        data: { productId: 1, complementId: 5, sortOrder: 2 },
      });
      expect(result).toBeDefined();
    });
  });

  describe('removeComplement', () => {
    it('deletes link and returns product', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(mockProduct);
      mockPrisma.productComplement.delete.mockResolvedValue({});

      await service.removeComplement(10, 1, 5);

      expect(mockPrisma.productComplement.delete).toHaveBeenCalledWith({
        where: { productId_complementId: { productId: 1, complementId: 5 } },
      });
    });
  });

  describe('reorderComplements', () => {
    it('throws 422 when complementId is not linked to product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productComplement.findMany.mockResolvedValue([
        { complementId: 5 },
        { complementId: 6 },
      ]);

      await expect(
        service.reorderComplements(10, 1, { complementIds: [5, 99] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when a linked complementId is missing from list', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productComplement.findMany.mockResolvedValue([
        { complementId: 5 },
        { complementId: 6 },
      ]);

      await expect(
        service.reorderComplements(10, 1, { complementIds: [5] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('updates sortOrder in correct order', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct);
      mockPrisma.productComplement.findMany.mockResolvedValue([
        { complementId: 5 },
        { complementId: 6 },
      ]);
      mockPrisma.productComplement.update.mockResolvedValue({});

      await service.reorderComplements(10, 1, { complementIds: [6, 5] });

      expect(mockPrisma.productComplement.update).toHaveBeenCalledWith({
        where: { productId_complementId: { productId: 1, complementId: 6 } },
        data: { sortOrder: 0 },
      });
      expect(mockPrisma.productComplement.update).toHaveBeenCalledWith({
        where: { productId_complementId: { productId: 1, complementId: 5 } },
        data: { sortOrder: 1 },
      });
    });
  });

  describe('batchUpdate', () => {
    it('updates N products respecting tenant isolation', async () => {
      mockPrisma.product.count.mockResolvedValue(3);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.batchUpdate(10, {
        productIds: [1, 2, 3],
        updates: { disponivel: false, emDestaque: true },
      });

      expect(result).toEqual({ updated: 3 });
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] }, restaurantId: 10 },
        data: { disponivel: false, emDestaque: true },
      });
    });

    it('throws 422 when a productId belongs to another restaurant', async () => {
      mockPrisma.product.count.mockResolvedValue(2); // 3 requested, only 2 found

      await expect(
        service.batchUpdate(10, {
          productIds: [1, 2, 99],
          updates: { disponivel: false },
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
