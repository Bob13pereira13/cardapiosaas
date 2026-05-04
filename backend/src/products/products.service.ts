import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    nome: string;
    preco: number;
    imagem?: string;
    categoryId?: number;
    userId: number;
  }) {
    return this.prisma.product.create({
      data: {
        nome: data.nome,
        preco: data.preco,
        imagem: data.imagem,
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
        orderBy: { id: 'desc' },
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
      preco?: number;
      imagem?: string;
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
}
