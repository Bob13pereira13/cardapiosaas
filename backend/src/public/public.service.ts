import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getCardapio(slug: string) {
    const productSelect = {
      id: true,
      nome: true,
      descricao: true,
      preco: true,
      imagem: true,
      categoryId: true,
    };

    const onlyAvailable = { disponivel: true };

    const user = await this.prisma.user.findFirst({
      where: { slug },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
        categories: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            nome: true,
            products: {
              where: onlyAvailable,
              orderBy: { id: 'asc' },
              take: 100,
              select: productSelect,
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Cardápio não encontrado');
    }

    const uncategorized = await this.prisma.product.findMany({
      where: { userId: user.id, categoryId: null, disponivel: true },
      orderBy: { id: 'asc' },
      take: 100,
      select: productSelect,
    });

    const allCategories = uncategorized.length > 0
      ? [...user.categories, { id: 0, nome: 'Outros', products: uncategorized }]
      : user.categories;

    const categories = allCategories.filter(c => c.products.length > 0);

    const { id: _id, ...publicFields } = user;
    return { ...publicFields, categories };
  }
}