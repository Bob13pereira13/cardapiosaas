import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(data: { nome: string; userId: number; ativa?: boolean; icone?: string }) {
    return this.prisma.category.create({
      data: {
        nome: data.nome,
        ativa: data.ativa ?? true,
        icone: data.icone,
        userId: data.userId,
      },
    });
  }

  findByUser(userId: number) {
    return this.prisma.category.findMany({
      where: { userId },
      include: { products: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async update(id: number, userId: number, data: { nome?: string; ativa?: boolean; icone?: string }) {
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

  async reorder(userId: number, ids: number[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.category.updateMany({
          where: { id, userId },
          data: { displayOrder: index },
        }),
      ),
    );
    return { ok: true };
  }
}
