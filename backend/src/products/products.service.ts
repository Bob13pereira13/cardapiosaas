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

  findByUser(userId: number) {
    return this.prisma.product.findMany({
      where: { userId },
      include: {
        category: true,
      },
    });
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
      where: {
        id,
        userId,
      },
      data,
    });
  }

  async delete(id: number, userId: number) {
    return this.prisma.product.deleteMany({
      where: {
        id,
        userId,
      },
    });
  }
}