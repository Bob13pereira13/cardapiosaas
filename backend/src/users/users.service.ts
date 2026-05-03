import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private gerarSlug(nome: string) {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async create(data: { nome: string; email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const slug = this.gerarSlug(data.nome);

    return this.prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        password: hashedPassword,
        slug,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateWhatsapp(userId: number, whatsapp: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { whatsapp },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        whatsapp: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
      },
    });
  }

  async updateMe(
    userId: number,
    data: {
      nome: string;
      whatsapp: string;
      slug: string;
      logo?: string;
      banner?: string;
      aberto?: boolean;
      horarioAbertura?: string;
      horarioFechamento?: string;
      corPrimaria?: string;
    }
  ) {
    const slugFormatado = this.gerarSlug(data.slug || data.nome);

    const slugExistente = await this.prisma.user.findFirst({
      where: {
        slug: slugFormatado,
        NOT: {
          id: userId,
        },
      },
    });

    if (slugExistente) {
      throw new BadRequestException('Este slug já está em uso.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nome: data.nome,
        whatsapp: data.whatsapp,
        slug: slugFormatado,
        logo: data.logo,
        banner: data.banner,
        aberto: data.aberto,
        horarioAbertura: data.horarioAbertura,
        horarioFechamento: data.horarioFechamento,
        corPrimaria: data.corPrimaria,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        whatsapp: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
      },
    });
  }
}