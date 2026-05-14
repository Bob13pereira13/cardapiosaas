import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, OptionStockStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { UploadResultDto } from '../storage/dto/upload-result.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { ListOptionsDto } from './dto/list-options.dto';
import {
  OptionResponseDto,
  PaginatedOptionsResponse,
} from './dto/option-response.dto';

@Injectable()
export class OptionsService {
  constructor(
    private prisma: PrismaService,
    private r2: R2Service,
    private imageProcessor: ImageProcessorService,
  ) {}

  async list(
    restaurantId: number,
    dto: ListOptionsDto,
  ): Promise<PaginatedOptionsResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      stockStatus,
      includeUsage,
    } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.OptionWhereInput = {
      restaurantId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
      ...(stockStatus && { stockStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.option.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: includeUsage
          ? {
              complementOptions: {
                where: { complement: { deletedAt: null } },
                include: { complement: { select: { id: true, name: true } } },
              },
            }
          : undefined,
      }),
      this.prisma.option.count({ where }),
    ]);

    const data: OptionResponseDto[] = items.map((opt) => {
      const base: OptionResponseDto = {
        id: opt.id,
        restaurantId: opt.restaurantId,
        name: opt.name,
        description: opt.description,
        imageUrl: opt.imageUrl,
        codePdv: opt.codePdv,
        costPrice: opt.costPrice,
        useTechSheet: opt.useTechSheet,
        stockStatus: opt.stockStatus,
        isActive: opt.isActive,
        createdAt: opt.createdAt,
        updatedAt: opt.updatedAt,
      };

      if (!includeUsage) return base;

      const co = (
        opt as typeof opt & {
          complementOptions: Array<{
            complement: { id: number; name: string };
          }>;
        }
      ).complementOptions;

      return {
        ...base,
        usedInComplements: co.length,
        complementsUsing: co.map((c) => c.complement),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, restaurantId: number): Promise<OptionResponseDto> {
    const opt = await this.prisma.option.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        complementOptions: {
          where: { complement: { deletedAt: null } },
          include: { complement: { select: { id: true, name: true } } },
        },
      },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');

    return {
      id: opt.id,
      restaurantId: opt.restaurantId,
      name: opt.name,
      description: opt.description,
      imageUrl: opt.imageUrl,
      codePdv: opt.codePdv,
      costPrice: opt.costPrice,
      useTechSheet: opt.useTechSheet,
      stockStatus: opt.stockStatus,
      isActive: opt.isActive,
      createdAt: opt.createdAt,
      updatedAt: opt.updatedAt,
      usedInComplements: opt.complementOptions.length,
      complementsUsing: opt.complementOptions.map((co) => co.complement),
    };
  }

  async create(
    restaurantId: number,
    dto: CreateOptionDto,
  ): Promise<OptionResponseDto> {
    try {
      const opt = await this.prisma.option.create({
        data: {
          restaurantId,
          name: dto.name,
          description: dto.description,
          imageUrl: dto.imageUrl,
          codePdv: dto.codePdv,
          costPrice: dto.costPrice,
          useTechSheet: dto.useTechSheet ?? false,
          stockStatus: dto.stockStatus ?? OptionStockStatus.ACTIVE,
          isActive: dto.isActive ?? true,
        },
      });
      return this.findOne(opt.id, restaurantId);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Já existe uma opção ativa com o nome "${dto.name}".`,
        );
      }
      throw err;
    }
  }

  async update(
    id: number,
    restaurantId: number,
    dto: UpdateOptionDto,
  ): Promise<OptionResponseDto> {
    await this.findOne(id, restaurantId);

    try {
      await this.prisma.option.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
          ...(dto.codePdv !== undefined && { codePdv: dto.codePdv }),
          ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
          ...(dto.useTechSheet !== undefined && {
            useTechSheet: dto.useTechSheet,
          }),
          ...(dto.stockStatus !== undefined && {
            stockStatus: dto.stockStatus,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Já existe uma opção ativa com o nome "${dto.name}".`,
        );
      }
      throw err;
    }

    return this.findOne(id, restaurantId);
  }

  async softDelete(id: number, restaurantId: number): Promise<{ ok: boolean }> {
    const opt = await this.prisma.option.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        complementOptions: {
          where: { complement: { deletedAt: null } },
        },
      },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');

    if (opt.complementOptions.length > 0) {
      throw new BadRequestException(
        `Opção em uso por ${opt.complementOptions.length} complemento(s). Remova o vínculo antes de excluir.`,
      );
    }

    await this.prisma.option.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  }

  async toggleStockStatus(
    id: number,
    restaurantId: number,
  ): Promise<OptionResponseDto> {
    const opt = await this.prisma.option.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');

    const next =
      opt.stockStatus === OptionStockStatus.ACTIVE
        ? OptionStockStatus.OUT_OF_STOCK
        : OptionStockStatus.ACTIVE;

    await this.prisma.option.update({
      where: { id },
      data: { stockStatus: next },
    });

    return this.findOne(id, restaurantId);
  }

  async uploadImage(
    restaurantId: number,
    optionId: number,
    file: Express.Multer.File,
  ): Promise<UploadResultDto> {
    const opt = await this.prisma.option.findFirst({
      where: { id: optionId, restaurantId, deletedAt: null },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');

    const processed = await this.imageProcessor.process(file);
    const key = `options/${restaurantId}/${randomUUID()}.webp`;
    const url = await this.r2.upload(
      key,
      processed.buffer,
      processed.contentType,
    );

    if (opt.imageUrl) {
      await this.r2.deleteByUrl(opt.imageUrl);
    }

    await this.prisma.option.update({
      where: { id: optionId },
      data: { imageUrl: url },
    });

    return {
      url,
      width: processed.width,
      height: processed.height,
      byteSize: processed.byteSize,
    };
  }

  async removeImage(
    restaurantId: number,
    optionId: number,
  ): Promise<{ ok: boolean }> {
    const opt = await this.prisma.option.findFirst({
      where: { id: optionId, restaurantId, deletedAt: null },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');

    if (opt.imageUrl) {
      await this.r2.deleteByUrl(opt.imageUrl);
    }

    await this.prisma.option.update({
      where: { id: optionId },
      data: { imageUrl: null },
    });

    return { ok: true };
  }
}
