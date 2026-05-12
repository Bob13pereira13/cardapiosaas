import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(data: {
    nome: string;
    restaurantId: number;
    ativa?: boolean;
    icone?: string;
  }) {
    return this.prisma.category.create({
      data: {
        nome: data.nome,
        ativa: data.ativa ?? true,
        icone: data.icone,
        restaurantId: data.restaurantId,
      },
    });
  }

  findByRestaurant(restaurantId: number) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      include: { products: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async update(
    id: number,
    restaurantId: number,
    data: { nome?: string; ativa?: boolean; icone?: string },
  ) {
    return this.prisma.category.updateMany({
      where: { id, restaurantId },
      data,
    });
  }

  async delete(id: number, restaurantId: number) {
    return this.prisma.category.deleteMany({
      where: { id, restaurantId },
    });
  }

  async reorder(restaurantId: number, ids: number[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.category.updateMany({
          where: { id, restaurantId },
          data: { displayOrder: index },
        }),
      ),
    );
    return { ok: true };
  }
}
