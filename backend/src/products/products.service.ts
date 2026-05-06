import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
    userId: number;
  }) {
    return this.prisma.product.create({
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
        userId: data.userId,
      },
    });
  }

  async findByUser(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { userId },
        include: { category: true },
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.product.count({ where: { userId } }),
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
    userId: number,
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
    },
  ) {
    return this.prisma.product.updateMany({
      where: { id, userId },
      data,
    });
  }

  async delete(id: number, userId: number) {
    return this.prisma.product.deleteMany({
      where: { id, userId },
    });
  }

  async reorder(userId: number, ids: number[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.product.updateMany({
          where: { id, userId },
          data: { displayOrder: index },
        }),
      ),
    );
    return { ok: true };
  }

  async duplicate(id: number, userId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
    });
    if (!product) return null;
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } =
      product as typeof product & { createdAt?: Date; updatedAt?: Date };
    return this.prisma.product.create({
      data: {
        ...data,
        nome: `${product.nome} (cópia)`,
      },
    });
  }
}
