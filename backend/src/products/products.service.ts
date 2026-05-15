import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { R2Service } from '../storage/r2.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { UploadResultDto } from '../storage/dto/upload-result.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddComplementToProductDto } from './dto/add-complement-to-product.dto';
import { ReorderProductComplementsDto } from './dto/reorder-product-complements.dto';
import { BatchUpdateProductsDto } from './dto/batch-update-products.dto';

const PRODUCT_INCLUDE = {
  category: true,
  printAreas: {
    include: {
      productionSector: { select: { id: true, nome: true, cor: true } },
    },
  },
  productComplements: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      complement: {
        select: {
          id: true,
          name: true,
          selectionRule: true,
          minSelections: true,
          maxSelections: true,
          isActive: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private r2: R2Service,
    private imageProcessor: ImageProcessorService,
  ) {}

  private generateInternalCode(restaurantId: number): string {
    const rand = Math.floor(Math.random() * 900) + 100;
    return `INT-${restaurantId}-${Date.now()}-${rand}`;
  }

  private validatePromoDates(
    start: string | Date | null | undefined,
    end: string | Date | null | undefined,
  ): void {
    if (!start || !end) return;
    const startTs = new Date(start).getTime();
    const endTs = new Date(end).getTime();
    if (startTs >= endTs) {
      throw new BadRequestException(
        'promoEndsAt deve ser posterior a promoStartsAt.',
      );
    }
  }

  async findOne(restaurantId: number, id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  async create(
    restaurantId: number,
    accountId: number | undefined,
    dto: CreateProductDto,
  ) {
    this.validatePromoDates(dto.promoStartsAt, dto.promoEndsAt);

    const internalCode = this.generateInternalCode(restaurantId);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          restaurantId,
          nome: dto.nome,
          descricao: dto.descricao,
          preco: dto.preco,
          precoPromocional: dto.precoPromocional,
          tempoPreparo: dto.tempoPreparo,
          sku: dto.sku,
          emDestaque: dto.emDestaque ?? false,
          estoqueAtivo: dto.estoqueAtivo ?? false,
          estoque: dto.estoque ?? 0,
          imagem: dto.imagem,
          disponivel: dto.disponivel ?? true,
          categoryId: dto.categoryId,
          disponibilidadeAtiva: dto.disponibilidadeAtiva ?? false,
          disponibilidadeInicio: dto.disponibilidadeInicio,
          disponibilidadeFim: dto.disponibilidadeFim,
          internalCode,
          isPromotional: dto.isPromotional ?? false,
          promoStartsAt: dto.promoStartsAt
            ? new Date(dto.promoStartsAt)
            : undefined,
          promoEndsAt: dto.promoEndsAt ? new Date(dto.promoEndsAt) : undefined,
          promoSchedule: dto.promoSchedule as Prisma.InputJsonValue | undefined,
          costPrice: dto.costPrice,
          useTechSheet: dto.useTechSheet ?? false,
          codePdv: dto.codePdv,
          labelType: dto.labelType,
          unitOfMeasure: dto.unitOfMeasure,
          useCustomNameKds: dto.useCustomNameKds ?? false,
          customNameKds: dto.customNameKds,
          hideObservations: dto.hideObservations ?? false,
          hideQtyButtons: dto.hideQtyButtons ?? false,
          isNew: dto.isNew ?? false,
          isAdult: dto.isAdult ?? false,
          isServiceFeeFree: dto.isServiceFeeFree ?? false,
          orderTypes: dto.orderTypes,
          availableLinks: dto.availableLinks,
        },
      });

      if (dto.printAreaIds && dto.printAreaIds.length > 0) {
        const sectors = await tx.productionSector.findMany({
          where: { id: { in: dto.printAreaIds }, restaurantId },
          select: { id: true },
        });
        if (sectors.length !== dto.printAreaIds.length) {
          const foundIds = sectors.map((s) => s.id);
          const invalid = dto.printAreaIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new UnprocessableEntityException(
            `Setores de produção inválidos: ${invalid.join(', ')}`,
          );
        }
        await tx.productPrintArea.createMany({
          data: dto.printAreaIds.map((productionSectorId) => ({
            productId: created.id,
            productionSectorId,
          })),
        });
      }

      if (dto.complementIds && dto.complementIds.length > 0) {
        const complements = await tx.complement.findMany({
          where: {
            id: { in: dto.complementIds },
            restaurantId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (complements.length !== dto.complementIds.length) {
          const foundIds = complements.map((c) => c.id);
          const invalid = dto.complementIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new UnprocessableEntityException(
            `Complementos inválidos: ${invalid.join(', ')}`,
          );
        }
        await tx.productComplement.createMany({
          data: dto.complementIds.map((complementId, idx) => ({
            productId: created.id,
            complementId,
            sortOrder: idx,
          })),
        });
      }

      return created;
    });

    void this.audit.log(
      restaurantId,
      'PRODUCT_CREATE',
      'Product',
      product.id,
      { nome: dto.nome },
      accountId,
    );

    return this.findOne(restaurantId, product.id);
  }

  async findByRestaurant(restaurantId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { restaurantId, deletedAt: null },
        include: PRODUCT_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.product.count({ where: { restaurantId, deletedAt: null } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    restaurantId: number,
    id: number,
    dto: UpdateProductDto,
    accountId?: number,
  ) {
    const product = await this.findOne(restaurantId, id);

    if (dto.isPromotional === true) {
      const hasPromoPrice =
        (dto.precoPromocional !== undefined && dto.precoPromocional > 0) ||
        (product.precoPromocional !== null &&
          product.precoPromocional !== undefined &&
          product.precoPromocional > 0);
      if (!hasPromoPrice) {
        throw new BadRequestException(
          'Para ativar isPromotional, precoPromocional deve ser preenchido.',
        );
      }
    }

    const startDate = dto.promoStartsAt ?? product.promoStartsAt;
    const endDate = dto.promoEndsAt ?? product.promoEndsAt;
    this.validatePromoDates(startDate, endDate);

    await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.preco !== undefined && { preco: dto.preco }),
        ...(dto.precoPromocional !== undefined && {
          precoPromocional: dto.precoPromocional,
        }),
        ...(dto.tempoPreparo !== undefined && {
          tempoPreparo: dto.tempoPreparo,
        }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.emDestaque !== undefined && { emDestaque: dto.emDestaque }),
        ...(dto.estoqueAtivo !== undefined && {
          estoqueAtivo: dto.estoqueAtivo,
        }),
        ...(dto.estoque !== undefined && { estoque: dto.estoque }),
        ...(dto.imagem !== undefined && { imagem: dto.imagem }),
        ...(dto.disponivel !== undefined && { disponivel: dto.disponivel }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.disponibilidadeAtiva !== undefined && {
          disponibilidadeAtiva: dto.disponibilidadeAtiva,
        }),
        ...(dto.disponibilidadeInicio !== undefined && {
          disponibilidadeInicio: dto.disponibilidadeInicio,
        }),
        ...(dto.disponibilidadeFim !== undefined && {
          disponibilidadeFim: dto.disponibilidadeFim,
        }),
        ...(dto.isPromotional !== undefined && {
          isPromotional: dto.isPromotional,
        }),
        ...(dto.promoStartsAt !== undefined && {
          promoStartsAt: dto.promoStartsAt ? new Date(dto.promoStartsAt) : null,
        }),
        ...(dto.promoEndsAt !== undefined && {
          promoEndsAt: dto.promoEndsAt ? new Date(dto.promoEndsAt) : null,
        }),
        ...(dto.promoSchedule !== undefined && {
          promoSchedule: dto.promoSchedule as Prisma.InputJsonValue,
        }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.useTechSheet !== undefined && {
          useTechSheet: dto.useTechSheet,
        }),
        ...(dto.codePdv !== undefined && { codePdv: dto.codePdv }),
        ...(dto.labelType !== undefined && { labelType: dto.labelType }),
        ...(dto.unitOfMeasure !== undefined && {
          unitOfMeasure: dto.unitOfMeasure,
        }),
        ...(dto.useCustomNameKds !== undefined && {
          useCustomNameKds: dto.useCustomNameKds,
        }),
        ...(dto.customNameKds !== undefined && {
          customNameKds: dto.customNameKds,
        }),
        ...(dto.hideObservations !== undefined && {
          hideObservations: dto.hideObservations,
        }),
        ...(dto.hideQtyButtons !== undefined && {
          hideQtyButtons: dto.hideQtyButtons,
        }),
        ...(dto.isNew !== undefined && { isNew: dto.isNew }),
        ...(dto.isAdult !== undefined && { isAdult: dto.isAdult }),
        ...(dto.isServiceFeeFree !== undefined && {
          isServiceFeeFree: dto.isServiceFeeFree,
        }),
        ...(dto.orderTypes !== undefined && { orderTypes: dto.orderTypes }),
        ...(dto.availableLinks !== undefined && {
          availableLinks: dto.availableLinks,
        }),
      },
    });

    void this.audit.log(
      restaurantId,
      'PRODUCT_UPDATE',
      'Product',
      id,
      { nome: product.nome },
      accountId,
    );

    return this.findOne(restaurantId, id);
  }

  async softDelete(restaurantId: number, id: number, accountId?: number) {
    const product = await this.findOne(restaurantId, id);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), disponivel: false },
    });

    void this.audit.log(
      restaurantId,
      'PRODUCT_DELETE',
      'Product',
      id,
      { nome: product.nome },
      accountId,
    );

    return { ok: true };
  }

  async addComplement(
    restaurantId: number,
    productId: number,
    dto: AddComplementToProductDto,
  ) {
    const [product, complement] = await Promise.all([
      this.prisma.product.findFirst({
        where: { id: productId, restaurantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.complement.findFirst({
        where: { id: dto.complementId, restaurantId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (!complement) throw new NotFoundException('Complemento não encontrado.');

    try {
      await this.prisma.productComplement.create({
        data: {
          productId,
          complementId: dto.complementId,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Complemento já vinculado ao produto.');
      }
      throw err;
    }

    return this.findOne(restaurantId, productId);
  }

  async removeComplement(
    restaurantId: number,
    productId: number,
    complementId: number,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    await this.prisma.productComplement.delete({
      where: { productId_complementId: { productId, complementId } },
    });

    return this.findOne(restaurantId, productId);
  }

  async reorderComplements(
    restaurantId: number,
    productId: number,
    dto: ReorderProductComplementsDto,
  ) {
    await this.findOne(restaurantId, productId);

    const current = await this.prisma.productComplement.findMany({
      where: { productId },
      select: { complementId: true },
    });

    const currentIds = current.map((c) => c.complementId);
    const incoming = dto.complementIds;

    const unknown = incoming.filter((id) => !currentIds.includes(id));
    if (unknown.length > 0) {
      throw new UnprocessableEntityException(
        `Complementos não vinculados ao produto: ${unknown.join(', ')}`,
      );
    }

    const missing = currentIds.filter((id) => !incoming.includes(id));
    if (missing.length > 0) {
      throw new UnprocessableEntityException(
        `Complementos do produto ausentes na ordenação: ${missing.join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      incoming.map((complementId, idx) =>
        this.prisma.productComplement.update({
          where: { productId_complementId: { productId, complementId } },
          data: { sortOrder: idx },
        }),
      ),
    );

    return this.findOne(restaurantId, productId);
  }

  async batchUpdate(restaurantId: number, dto: BatchUpdateProductsDto) {
    const count = await this.prisma.product.count({
      where: { id: { in: dto.productIds }, restaurantId, deletedAt: null },
    });

    if (count !== dto.productIds.length) {
      throw new UnprocessableEntityException(
        'Um ou mais produtos não foram encontrados ou não pertencem a este restaurante.',
      );
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: dto.productIds }, restaurantId },
      data: {
        ...(dto.updates.categoryId !== undefined && {
          categoryId: dto.updates.categoryId,
        }),
        ...(dto.updates.disponivel !== undefined && {
          disponivel: dto.updates.disponivel,
        }),
        ...(dto.updates.emDestaque !== undefined && {
          emDestaque: dto.updates.emDestaque,
        }),
        ...(dto.updates.estoqueAtivo !== undefined && {
          estoqueAtivo: dto.updates.estoqueAtivo,
        }),
        ...(dto.updates.labelType !== undefined && {
          labelType: dto.updates.labelType,
        }),
      },
    });

    return { updated: result.count };
  }

  async replaceAvailability(
    productId: number,
    restaurantId: number,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    await this.prisma.$transaction([
      this.prisma.productAvailability.deleteMany({ where: { productId } }),
      ...(slots.length > 0
        ? [
            this.prisma.productAvailability.createMany({
              data: slots.map((s) => ({ productId, ...s })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return this.prisma.productAvailability.findMany({
      where: { productId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async reorder(restaurantId: number, ids: number[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.product.updateMany({
          where: { id, restaurantId },
          data: { displayOrder: index },
        }),
      ),
    );
    return { ok: true };
  }

  async duplicate(id: number, restaurantId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });
    if (!product) return null;

    return this.prisma.product.create({
      data: {
        restaurantId: product.restaurantId,
        nome: `${product.nome} (cópia)`,
        descricao: product.descricao,
        preco: product.preco,
        precoPromocional: product.precoPromocional,
        tempoPreparo: product.tempoPreparo,
        sku: product.sku,
        emDestaque: product.emDestaque,
        estoqueAtivo: product.estoqueAtivo,
        estoque: product.estoque,
        imagem: product.imagem,
        disponivel: product.disponivel,
        categoryId: product.categoryId,
        displayOrder: product.displayOrder,
        disponibilidadeAtiva: product.disponibilidadeAtiva,
        disponibilidadeInicio: product.disponibilidadeInicio,
        disponibilidadeFim: product.disponibilidadeFim,
        isPromotional: product.isPromotional,
        costPrice: product.costPrice,
        useTechSheet: product.useTechSheet,
        codePdv: product.codePdv,
        labelType: product.labelType,
        unitOfMeasure: product.unitOfMeasure,
        useCustomNameKds: product.useCustomNameKds,
        customNameKds: product.customNameKds,
        hideObservations: product.hideObservations,
        hideQtyButtons: product.hideQtyButtons,
        isNew: product.isNew,
        isAdult: product.isAdult,
        isServiceFeeFree: product.isServiceFeeFree,
        orderTypes: product.orderTypes,
        availableLinks: product.availableLinks,
        internalCode: this.generateInternalCode(restaurantId),
      },
    });
  }

  // legacy delete kept for backward compatibility with existing callers
  async delete(id: number, restaurantId: number, accountId?: number) {
    return this.softDelete(restaurantId, id, accountId);
  }

  async uploadImage(
    restaurantId: number,
    productId: number,
    file: Express.Multer.File,
  ): Promise<UploadResultDto> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const processed = await this.imageProcessor.process(file);
    const key = `products/${restaurantId}/${randomUUID()}.webp`;
    const url = await this.r2.upload(
      key,
      processed.buffer,
      processed.contentType,
    );

    if (product.imagem) {
      await this.r2.deleteByUrl(product.imagem);
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { imagem: url },
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
    productId: number,
  ): Promise<{ ok: boolean }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    if (product.imagem) {
      await this.r2.deleteByUrl(product.imagem);
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { imagem: null },
    });

    return { ok: true };
  }
}
