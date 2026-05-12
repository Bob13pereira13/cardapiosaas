import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: {
    nome: string;
    descricao?: string;
    preco: number;
    precoPromocional?: number;
    tempoPreparo?: number;
    sku?: string;
    emDestaque?: boolean;
    estoqueAtivo?: boolean;
    estoque?: number;
    imagem?: string;
    disponivel?: boolean;
    categoryId?: number;
    restaurantId: number;
    accountId?: number;
    disponibilidadeAtiva?: boolean;
    disponibilidadeInicio?: string;
    disponibilidadeFim?: string;
    productionSectorId?: number;
  }) {
    const product = await this.prisma.product.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: data.preco,
        precoPromocional: data.precoPromocional,
        tempoPreparo: data.tempoPreparo,
        sku: data.sku,
        emDestaque: data.emDestaque ?? false,
        estoqueAtivo: data.estoqueAtivo ?? false,
        estoque: data.estoque ?? 0,
        imagem: data.imagem,
        disponivel: data.disponivel ?? true,
        categoryId: data.categoryId,
        restaurantId: data.restaurantId,
        disponibilidadeAtiva: data.disponibilidadeAtiva ?? false,
        disponibilidadeInicio: data.disponibilidadeInicio,
        disponibilidadeFim: data.disponibilidadeFim,
        productionSectorId: data.productionSectorId,
      },
    });
    void this.audit.log(
      data.restaurantId,
      'PRODUCT_CREATE',
      'Product',
      product.id,
      { nome: data.nome },
      data.accountId,
    );
    return product;
  }

  async findByRestaurant(restaurantId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { restaurantId },
        include: {
          category: true,
          optionGroups: {
            orderBy: { ordem: 'asc' },
            include: {
              optionGroup: {
                include: { options: { orderBy: { displayOrder: 'asc' } } },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.product.count({ where: { restaurantId } }),
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
    id: number,
    restaurantId: number,
    data: {
      nome?: string;
      descricao?: string;
      preco?: number;
      precoPromocional?: number | null;
      tempoPreparo?: number | null;
      sku?: string | null;
      emDestaque?: boolean;
      estoqueAtivo?: boolean;
      estoque?: number;
      imagem?: string;
      disponivel?: boolean;
      categoryId?: number;
      disponibilidadeAtiva?: boolean;
      disponibilidadeInicio?: string | null;
      disponibilidadeFim?: string | null;
      productionSectorId?: number | null;
    },
  ) {
    return this.prisma.product.updateMany({
      where: { id, restaurantId },
      data,
    });
  }

  async replaceAvailability(
    productId: number,
    restaurantId: number,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
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

  async delete(id: number, restaurantId: number, accountId?: number) {
    const result = await this.prisma.product.deleteMany({
      where: { id, restaurantId },
    });
    if (result.count > 0)
      void this.audit.log(
        restaurantId,
        'PRODUCT_DELETE',
        'Product',
        id,
        undefined,
        accountId,
      );
    return result;
  }

  async linkComplemento(
    productId: number,
    complementoId: number,
    restaurantId: number,
    ordem = 0,
  ) {
    await this.verifyProductAndComplement(
      productId,
      complementoId,
      restaurantId,
    );
    return this.prisma.productComplement.upsert({
      where: {
        productId_optionGroupId: { productId, optionGroupId: complementoId },
      },
      create: { productId, optionGroupId: complementoId, ordem },
      update: { ordem },
    });
  }

  async unlinkComplemento(
    productId: number,
    complementoId: number,
    restaurantId: number,
  ) {
    await this.verifyProductAndComplement(
      productId,
      complementoId,
      restaurantId,
    );
    await this.prisma.productComplement.deleteMany({
      where: { productId, optionGroupId: complementoId },
    });
    return { ok: true };
  }

  private async verifyProductAndComplement(
    productId: number,
    complementoId: number,
    restaurantId: number,
  ) {
    const [product, complemento] = await Promise.all([
      this.prisma.product.findFirst({
        where: { id: productId, restaurantId },
        select: { id: true },
      }),
      this.prisma.optionGroup.findFirst({
        where: { id: complementoId, restaurantId },
        select: { id: true },
      }),
    ]);
    if (!product) throw new NotFoundException('Produto nao encontrado.');
    if (!complemento)
      throw new NotFoundException('Complemento nao encontrado.');
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
      where: { id, restaurantId },
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
      },
    });
  }
}
