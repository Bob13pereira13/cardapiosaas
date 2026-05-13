import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ComplementPriceMode,
  ComplementSelectionRule,
  ComplementVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplementDto } from './dto/create-complement.dto';
import { UpdateComplementDto } from './dto/update-complement.dto';
import { ListComplementsDto } from './dto/list-complements.dto';
import { AddOptionToComplementDto } from './dto/add-option-to-complement.dto';
import { UpdateComplementOptionDto } from './dto/update-complement-option.dto';
import { ReorderComplementOptionsDto } from './dto/reorder-complement-options.dto';
import {
  ComplementResponseDto,
  PaginatedComplementsResponse,
} from './dto/complement-response.dto';

const OPTION_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  costPrice: true,
  stockStatus: true,
  isActive: true,
} as const;

const COMPLEMENT_OPTIONS_INCLUDE = {
  orderBy: { sortOrder: 'asc' as const },
  include: { option: { select: OPTION_SELECT } },
};

@Injectable()
export class ComplementsService {
  constructor(private prisma: PrismaService) {}

  private mapToDto(
    comp: {
      id: number;
      restaurantId: number;
      name: string;
      description: string | null;
      selectionRule: ComplementSelectionRule;
      minSelections: number;
      maxSelections: number;
      availableLinks: string[];
      visibility: ComplementVisibility;
      priceMode: ComplementPriceMode;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      complementOptions: Array<{
        id: number;
        optionId: number;
        extraPrice: Prisma.Decimal;
        isLocked: boolean;
        isVisible: boolean;
        sortOrder: number;
        option: {
          id: number;
          name: string;
          imageUrl: string | null;
          costPrice: Prisma.Decimal | null;
          stockStatus: string;
          isActive: boolean;
        };
      }>;
      _count?: { productComplements: number };
      productComplements?: Array<{ product: { id: number; nome: string } }>;
    },
    includeUsage?: boolean,
    includeProducts?: boolean,
  ): ComplementResponseDto {
    const dto: ComplementResponseDto = {
      id: comp.id,
      restaurantId: comp.restaurantId,
      name: comp.name,
      description: comp.description,
      selectionRule: comp.selectionRule,
      minSelections: comp.minSelections,
      maxSelections: comp.maxSelections,
      availableLinks:
        comp.availableLinks as ComplementResponseDto['availableLinks'],
      visibility: comp.visibility,
      priceMode: comp.priceMode,
      isActive: comp.isActive,
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
      options: comp.complementOptions.map((co) => ({
        id: co.id,
        optionId: co.optionId,
        extraPrice: co.extraPrice,
        isLocked: co.isLocked,
        isVisible: co.isVisible,
        sortOrder: co.sortOrder,
        option: co.option as ComplementResponseDto['options'][number]['option'],
      })),
    };

    if (includeUsage && comp._count) {
      dto.usedInProducts = comp._count.productComplements;
    }

    if (includeProducts && comp.productComplements) {
      dto.productsUsing = comp.productComplements.map((pc) => ({
        id: pc.product.id,
        name: pc.product.nome,
      }));
    }

    return dto;
  }

  async list(
    restaurantId: number,
    dto: ListComplementsDto,
  ): Promise<PaginatedComplementsResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      selectionRule,
      visibility,
      includeUsage,
    } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ComplementWhereInput = {
      restaurantId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
      ...(selectionRule && { selectionRule }),
      ...(visibility && { visibility }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.complement.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          complementOptions: COMPLEMENT_OPTIONS_INCLUDE,
          _count: { select: { productComplements: true } },
        },
      }),
      this.prisma.complement.count({ where }),
    ]);

    return {
      data: items.map((c) => this.mapToDto(c, includeUsage)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    restaurantId: number,
    id: number,
  ): Promise<ComplementResponseDto> {
    const comp = await this.prisma.complement.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        complementOptions: COMPLEMENT_OPTIONS_INCLUDE,
        _count: { select: { productComplements: true } },
        productComplements: {
          where: { product: { deletedAt: null } },
          include: { product: { select: { id: true, nome: true } } },
        },
      },
    });
    if (!comp) throw new NotFoundException('Complemento não encontrado.');

    return this.mapToDto(comp, true, true);
  }

  private validateConsistency(
    selectionRule: ComplementSelectionRule | undefined,
    minSelections: number | undefined,
    maxSelections: number | undefined,
    availableLinks: string[] | undefined,
  ): { min: number; max: number } {
    const min = minSelections ?? 0;
    let max = maxSelections ?? 1;

    if (selectionRule === ComplementSelectionRule.SINGLE) {
      max = 1;
    }

    if (min > max) {
      throw new BadRequestException(
        `minSelections (${min}) não pode ser maior que maxSelections (${max}).`,
      );
    }

    if (availableLinks !== undefined && availableLinks.length === 0) {
      throw new BadRequestException('availableLinks não pode estar vazio.');
    }

    return { min, max };
  }

  async create(
    restaurantId: number,
    dto: CreateComplementDto,
  ): Promise<ComplementResponseDto> {
    const { min, max } = this.validateConsistency(
      dto.selectionRule,
      dto.minSelections,
      dto.maxSelections,
      dto.availableLinks,
    );

    if (dto.availableLinks.length === 0) {
      throw new BadRequestException('availableLinks não pode estar vazio.');
    }

    if (dto.options && dto.options.length > 0) {
      const optionIds = dto.options.map((o) => o.optionId);
      const validOptions = await this.prisma.option.findMany({
        where: { id: { in: optionIds }, restaurantId, deletedAt: null },
        select: { id: true },
      });
      if (validOptions.length !== optionIds.length) {
        const foundIds = validOptions.map((o) => o.id);
        const invalidIds = optionIds.filter((id) => !foundIds.includes(id));
        throw new UnprocessableEntityException(
          `Opções não encontradas ou não pertencem a este restaurante: ${invalidIds.join(', ')}`,
        );
      }
    }

    const comp = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complement.create({
        data: {
          restaurantId,
          name: dto.name,
          description: dto.description,
          selectionRule: dto.selectionRule,
          priceMode: dto.priceMode ?? ComplementPriceMode.SUM_OF_SELECTED,
          minSelections: min,
          maxSelections: max,
          availableLinks: dto.availableLinks,
          visibility: dto.visibility ?? ComplementVisibility.VISIBLE,
          isActive: true,
        },
      });

      if (dto.options && dto.options.length > 0) {
        await tx.complementOption.createMany({
          data: dto.options.map((o, idx) => ({
            complementId: created.id,
            optionId: o.optionId,
            extraPrice: o.extraPrice ?? 0,
            isLocked: o.isLocked ?? false,
            isVisible: o.isVisible ?? true,
            sortOrder: o.sortOrder ?? idx,
          })),
        });
      }

      return created;
    });

    return this.findOne(restaurantId, comp.id);
  }

  async update(
    restaurantId: number,
    id: number,
    dto: UpdateComplementDto,
  ): Promise<ComplementResponseDto> {
    const existing = await this.findOne(restaurantId, id);

    const selectionRule = dto.selectionRule ?? existing.selectionRule;
    const { min, max } = this.validateConsistency(
      selectionRule,
      dto.minSelections ?? existing.minSelections,
      dto.maxSelections ?? existing.maxSelections,
      dto.availableLinks,
    );

    await this.prisma.complement.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.selectionRule !== undefined && {
          selectionRule: dto.selectionRule,
          maxSelections: max,
        }),
        ...(dto.minSelections !== undefined && { minSelections: min }),
        ...(dto.maxSelections !== undefined && { maxSelections: max }),
        ...(dto.availableLinks !== undefined && {
          availableLinks: dto.availableLinks,
        }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.priceMode !== undefined && { priceMode: dto.priceMode }),
      },
    });

    return this.findOne(restaurantId, id);
  }

  async softDelete(restaurantId: number, id: number): Promise<{ ok: boolean }> {
    await this.findOne(restaurantId, id);

    const inUse = await this.prisma.productComplement.count({
      where: {
        complementId: id,
        product: { deletedAt: null },
      },
    });

    if (inUse > 0) {
      throw new UnprocessableEntityException(
        `Complemento em uso em ${inUse} produto(s) ativo(s). Remova o vínculo antes de excluir.`,
      );
    }

    await this.prisma.complement.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { ok: true };
  }

  async addOption(
    restaurantId: number,
    complementId: number,
    dto: AddOptionToComplementDto,
  ): Promise<ComplementResponseDto> {
    await this.findOne(restaurantId, complementId);

    const option = await this.prisma.option.findFirst({
      where: { id: dto.optionId, restaurantId, deletedAt: null },
    });
    if (!option) {
      throw new NotFoundException(
        `Opção ${dto.optionId} não encontrada ou não pertence a este restaurante.`,
      );
    }

    try {
      await this.prisma.complementOption.create({
        data: {
          complementId,
          optionId: dto.optionId,
          extraPrice: dto.extraPrice ?? 0,
          isLocked: dto.isLocked ?? false,
          isVisible: dto.isVisible ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Opção ${dto.optionId} já está neste complemento.`,
        );
      }
      throw err;
    }

    return this.findOne(restaurantId, complementId);
  }

  async removeOption(
    restaurantId: number,
    complementId: number,
    optionId: number,
  ): Promise<ComplementResponseDto> {
    await this.findOne(restaurantId, complementId);

    await this.prisma.complementOption.delete({
      where: { complementId_optionId: { complementId, optionId } },
    });

    return this.findOne(restaurantId, complementId);
  }

  async updateComplementOption(
    restaurantId: number,
    complementId: number,
    optionId: number,
    dto: UpdateComplementOptionDto,
  ): Promise<ComplementResponseDto> {
    await this.findOne(restaurantId, complementId);

    await this.prisma.complementOption.update({
      where: { complementId_optionId: { complementId, optionId } },
      data: {
        ...(dto.extraPrice !== undefined && { extraPrice: dto.extraPrice }),
        ...(dto.isLocked !== undefined && { isLocked: dto.isLocked }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return this.findOne(restaurantId, complementId);
  }

  async reorderOptions(
    restaurantId: number,
    complementId: number,
    dto: ReorderComplementOptionsDto,
  ): Promise<ComplementResponseDto> {
    await this.findOne(restaurantId, complementId);

    const currentOptions = await this.prisma.complementOption.findMany({
      where: { complementId },
      select: { optionId: true },
    });

    const currentOptionIds = currentOptions.map((o) => o.optionId);
    const incomingIds = dto.optionIds;

    const unknownIds = incomingIds.filter(
      (id) => !currentOptionIds.includes(id),
    );
    if (unknownIds.length > 0) {
      throw new UnprocessableEntityException(
        `Opções não pertencem ao complemento: ${unknownIds.join(', ')}`,
      );
    }

    const missingIds = currentOptionIds.filter(
      (id) => !incomingIds.includes(id),
    );
    if (missingIds.length > 0) {
      throw new UnprocessableEntityException(
        `Opções do complemento ausentes na ordenação: ${missingIds.join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      incomingIds.map((optionId, idx) =>
        this.prisma.complementOption.update({
          where: { complementId_optionId: { complementId, optionId } },
          data: { sortOrder: idx },
        }),
      ),
    );

    return this.findOne(restaurantId, complementId);
  }
}
