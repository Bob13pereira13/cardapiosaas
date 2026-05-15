import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OptionStockStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { OptionsService } from './options.service';

const mockOption = {
  id: 1,
  restaurantId: 10,
  name: 'Queijo Extra',
  description: null,
  imageUrl: null,
  codePdv: null,
  costPrice: null,
  useTechSheet: false,
  stockStatus: OptionStockStatus.ACTIVE,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  complementOptions: [],
};

const mockPrisma = {
  option: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const mockR2 = {
  upload: jest.fn(),
  deleteByUrl: jest.fn(),
};

const mockImageProcessor = {
  process: jest.fn(),
};

describe('OptionsService', () => {
  let service: OptionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: R2Service, useValue: mockR2 },
        { provide: ImageProcessorService, useValue: mockImageProcessor },
      ],
    }).compile();

    service = module.get<OptionsService>(OptionsService);
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1, 10)).rejects.toThrow(NotFoundException);
    });

    it('returns option with complementsUsing populated', async () => {
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        complementOptions: [{ complement: { id: 5, name: 'Molhos' } }],
      });
      const result = await service.findOne(1, 10);
      expect(result.usedInComplements).toBe(1);
      expect(result.complementsUsing).toEqual([{ id: 5, name: 'Molhos' }]);
    });
  });

  describe('list', () => {
    it('returns paginated response', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockOption], 1]);
      const result = await service.list(10, { page: 1, limit: 20 });
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates and returns the new option', async () => {
      mockPrisma.option.create.mockResolvedValue({ id: 2, restaurantId: 10 });
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        id: 2,
        name: 'Bacon',
        complementOptions: [],
      });
      const result = await service.create(10, { name: 'Bacon' });
      expect(result.name).toBe('Bacon');
    });

    it('throws ConflictException on P2002', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      mockPrisma.option.create.mockRejectedValue(err);
      await expect(
        service.create(10, { name: 'Queijo Extra' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('softDelete', () => {
    it('throws NotFoundException when option missing', async () => {
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.softDelete(1, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnprocessableEntityException when option is in use', async () => {
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        complementOptions: [{ id: 99 }],
      });
      await expect(service.softDelete(1, 10)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('sets deletedAt when not in use', async () => {
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        complementOptions: [],
      });
      mockPrisma.option.update.mockResolvedValue({});
      const result = await service.softDelete(1, 10);
      expect(result).toEqual({ ok: true });
      expect(mockPrisma.option.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('toggleStockStatus', () => {
    it('throws NotFoundException when option missing', async () => {
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.toggleStockStatus(1, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('toggles ACTIVE → OUT_OF_STOCK', async () => {
      mockPrisma.option.findFirst
        .mockResolvedValueOnce({
          ...mockOption,
          stockStatus: OptionStockStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...mockOption,
          stockStatus: OptionStockStatus.OUT_OF_STOCK,
          complementOptions: [],
        });
      mockPrisma.option.update.mockResolvedValue({});
      const result = await service.toggleStockStatus(1, 10);
      expect(mockPrisma.option.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stockStatus: OptionStockStatus.OUT_OF_STOCK },
      });
      expect(result.stockStatus).toBe(OptionStockStatus.OUT_OF_STOCK);
    });

    it('toggles OUT_OF_STOCK → ACTIVE', async () => {
      mockPrisma.option.findFirst
        .mockResolvedValueOnce({
          ...mockOption,
          stockStatus: OptionStockStatus.OUT_OF_STOCK,
        })
        .mockResolvedValueOnce({
          ...mockOption,
          stockStatus: OptionStockStatus.ACTIVE,
          complementOptions: [],
        });
      mockPrisma.option.update.mockResolvedValue({});
      const result = await service.toggleStockStatus(1, 10);
      expect(mockPrisma.option.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stockStatus: OptionStockStatus.ACTIVE },
      });
      expect(result.stockStatus).toBe(OptionStockStatus.ACTIVE);
    });
  });

  describe('uploadImage', () => {
    const fakeFile = {
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
      size: 100,
    } as Express.Multer.File;
    const processed = {
      buffer: Buffer.from('webp'),
      contentType: 'image/webp' as const,
      width: 800,
      height: 600,
      byteSize: 4,
    };

    it('throws NotFoundException when option not found', async () => {
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.uploadImage(10, 1, fakeFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when option belongs to another restaurant', async () => {
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.uploadImage(99, 1, fakeFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('processes, uploads, updates DB and returns result', async () => {
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        imageUrl: null,
      });
      mockImageProcessor.process.mockResolvedValue(processed);
      mockR2.upload.mockResolvedValue(
        'https://cdn.example.com/options/10/uuid.webp',
      );
      mockPrisma.option.update.mockResolvedValue({});

      const result = await service.uploadImage(10, 1, fakeFile);

      expect(mockImageProcessor.process).toHaveBeenCalledWith(fakeFile);
      expect(mockR2.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^options\/10\/.+\.webp$/),
        processed.buffer,
        'image/webp',
      );
      expect(mockPrisma.option.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { imageUrl: 'https://cdn.example.com/options/10/uuid.webp' },
      });
      expect(result).toEqual({
        url: 'https://cdn.example.com/options/10/uuid.webp',
        width: 800,
        height: 600,
        byteSize: 4,
      });
    });

    it('deletes old image when one already exists', async () => {
      const oldUrl = 'https://cdn.example.com/options/10/old.webp';
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        imageUrl: oldUrl,
      });
      mockImageProcessor.process.mockResolvedValue(processed);
      mockR2.upload.mockResolvedValue(
        'https://cdn.example.com/options/10/new.webp',
      );
      mockPrisma.option.update.mockResolvedValue({});

      await service.uploadImage(10, 1, fakeFile);

      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(oldUrl);
    });
  });

  describe('removeImage', () => {
    it('throws NotFoundException when option not found', async () => {
      mockPrisma.option.findFirst.mockResolvedValue(null);
      await expect(service.removeImage(10, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes from R2 and nullifies imageUrl', async () => {
      const oldUrl = 'https://cdn.example.com/options/10/old.webp';
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        imageUrl: oldUrl,
      });
      mockR2.deleteByUrl.mockResolvedValue(undefined);
      mockPrisma.option.update.mockResolvedValue({});

      const result = await service.removeImage(10, 1);

      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(oldUrl);
      expect(mockPrisma.option.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { imageUrl: null },
      });
      expect(result).toEqual({ ok: true });
    });

    it('skips R2 delete and still nullifies imageUrl when no image exists', async () => {
      mockPrisma.option.findFirst.mockResolvedValue({
        ...mockOption,
        imageUrl: null,
      });
      mockPrisma.option.update.mockResolvedValue({});

      const result = await service.removeImage(10, 1);

      expect(mockR2.deleteByUrl).not.toHaveBeenCalled();
      expect(mockPrisma.option.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { imageUrl: null },
      });
      expect(result).toEqual({ ok: true });
    });
  });
});
