import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number) {
    return this.prisma.combo.findMany({
      where: { restaurantId },
      orderBy: { nome: 'asc' },
      include: {
        items: {
          include: {
            product: { select: { nome: true, preco: true, imagem: true } },
          },
        },
      },
    });
  }

  async findOne(restaurantId: number, id: number) {
    const combo = await this.prisma.combo.findFirst({
      where: { id, restaurantId },
      include: {
        items: {
          include: {
            product: { select: { nome: true, preco: true, imagem: true } },
          },
        },
      },
    });
    if (!combo) throw new NotFoundException('Combo nao encontrado.');
    return combo;
  }

  create(
    restaurantId: number,
    dto: {
      nome: string;
      descricao?: string;
      preco: number;
      imagem?: string;
      ativo?: boolean;
    },
  ) {
    return this.prisma.combo.create({ data: { restaurantId, ...dto } });
  }

  async update(
    restaurantId: number,
    id: number,
    dto: {
      nome?: string;
      descricao?: string;
      preco?: number;
      imagem?: string;
      ativo?: boolean;
    },
  ) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.combo.update({ where: { id }, data: dto });
  }

  async remove(restaurantId: number, id: number) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.combo.delete({ where: { id } });
  }

  async addItem(
    restaurantId: number,
    comboId: number,
    dto: { productId: number; quantidade?: number },
  ) {
    await this.ensureOwner(restaurantId, comboId);
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, restaurantId },
    });
    if (!product) throw new NotFoundException('Produto nao encontrado.');
    const exists = await this.prisma.comboItem.findFirst({
      where: { comboId, productId: dto.productId },
    });
    if (exists) throw new BadRequestException('Produto ja esta no combo.');
    return this.prisma.comboItem.create({
      data: {
        comboId,
        productId: dto.productId,
        quantidade: dto.quantidade ?? 1,
      },
      include: { product: { select: { nome: true, preco: true } } },
    });
  }

  async removeItem(restaurantId: number, comboId: number, itemId: number) {
    await this.ensureOwner(restaurantId, comboId);
    const item = await this.prisma.comboItem.findFirst({
      where: { id: itemId, comboId },
    });
    if (!item) throw new NotFoundException('Item nao encontrado.');
    return this.prisma.comboItem.delete({ where: { id: itemId } });
  }

  private async ensureOwner(restaurantId: number, comboId: number) {
    const combo = await this.prisma.combo.findFirst({
      where: { id: comboId, restaurantId },
    });
    if (!combo) throw new NotFoundException('Combo nao encontrado.');
    return combo;
  }
}
