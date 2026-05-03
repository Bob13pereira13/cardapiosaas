import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(data: { nome: string; userId: number }) {
    return this.prisma.category.create({
      data: {
        nome: data.nome,
        userId: data.userId,
      },
    });
  }

  findByUser(userId: number) {
    return this.prisma.category.findMany({
      where: { userId },
      include: {
        products: true,
      },
    });
  }

  async update(id: number, userId: number, data: { nome?: string }) {
    return this.prisma.category.updateMany({
      where: {
        id,
        userId,
      },
      data,
    });
  }

  async delete(id: number, userId: number) {
    return this.prisma.category.deleteMany({
      where: {
        id,
        userId,
      },
    });
  }
}