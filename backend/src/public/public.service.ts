import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getCardapio(slug: string) {
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
          orderBy: {
            id: 'asc',
          },
          select: {
            id: true,
            nome: true,
            products: {
              orderBy: { id: 'asc' },
              take: 100,
              select: {
                id: true,
                nome: true,
                preco: true,
                imagem: true,
                categoryId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Cardápio não encontrado');
    }

    return user;
  }
}