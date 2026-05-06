import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.table.findMany({
      where: { userId },
      orderBy: { numero: 'asc' },
      include: {
        comandas: {
          where: { status: 'ABERTA' },
          include: { items: { include: { product: { select: { nome: true } } } } },
          take: 1,
        },
      },
    });
  }

  async create(userId: number, dto: { numero: number; nome?: string; capacidade?: number }) {
    const exists = await this.prisma.table.findFirst({ where: { userId, numero: dto.numero } });
    if (exists) throw new BadRequestException('Ja existe uma mesa com esse numero.');
    return this.prisma.table.create({ data: { userId, ...dto } });
  }

  async update(userId: number, id: number, dto: { numero?: number; nome?: string; capacidade?: number; ativa?: boolean }) {
    await this.ensureOwner(userId, id);
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.ensureOwner(userId, id);
    const open = await this.prisma.comanda.count({ where: { tableId: id, status: 'ABERTA' } });
    if (open > 0) throw new BadRequestException('Mesa tem comanda aberta. Feche antes de excluir.');
    return this.prisma.table.delete({ where: { id } });
  }

  async getActiveComanda(userId: number, tableId: number) {
    await this.ensureOwner(userId, tableId);
    return this.prisma.comanda.findFirst({
      where: { tableId, userId, status: 'ABERTA' },
      include: { items: { include: { product: { select: { nome: true, preco: true } } } } },
    });
  }

  async openComanda(userId: number, tableId: number) {
    await this.ensureOwner(userId, tableId);
    const existing = await this.prisma.comanda.findFirst({ where: { tableId, status: 'ABERTA' } });
    if (existing) throw new BadRequestException('Mesa ja tem comanda aberta.');
    return this.prisma.comanda.create({ data: { tableId, userId } });
  }

  async addItem(userId: number, tableId: number, dto: { productId: number; quantidade: number; obs?: string }) {
    await this.ensureOwner(userId, tableId);
    const comanda = await this.prisma.comanda.findFirst({ where: { tableId, userId, status: 'ABERTA' } });
    if (!comanda) throw new NotFoundException('Nenhuma comanda aberta nesta mesa.');

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, userId } });
    if (!product) throw new NotFoundException('Produto nao encontrado.');

    const item = await this.prisma.comandaItem.create({
      data: { comandaId: comanda.id, productId: dto.productId, quantidade: dto.quantidade, preco: product.preco, obs: dto.obs },
      include: { product: { select: { nome: true } } },
    });

    await this.recalcTotal(comanda.id);
    return item;
  }

  async removeItem(userId: number, tableId: number, itemId: number) {
    await this.ensureOwner(userId, tableId);
    const item = await this.prisma.comandaItem.findFirst({
      where: { id: itemId, comanda: { tableId, userId } },
    });
    if (!item) throw new NotFoundException('Item nao encontrado.');
    await this.prisma.comandaItem.delete({ where: { id: itemId } });
    await this.recalcTotal(item.comandaId);
    return { deleted: true };
  }

  async closeComanda(userId: number, tableId: number) {
    await this.ensureOwner(userId, tableId);
    const comanda = await this.prisma.comanda.findFirst({
      where: { tableId, userId, status: 'ABERTA' },
      include: { items: true },
    });
    if (!comanda) throw new NotFoundException('Nenhuma comanda aberta.');
    return this.prisma.comanda.update({
      where: { id: comanda.id },
      data: { status: 'FECHADA', closedAt: new Date() },
    });
  }

  async transferComanda(userId: number, fromTableId: number, toTableId: number) {
    await this.ensureOwner(userId, fromTableId);
    await this.ensureOwner(userId, toTableId);
    const comanda = await this.prisma.comanda.findFirst({ where: { tableId: fromTableId, userId, status: 'ABERTA' } });
    if (!comanda) throw new NotFoundException('Nenhuma comanda aberta na mesa de origem.');
    const targetOpen = await this.prisma.comanda.count({ where: { tableId: toTableId, status: 'ABERTA' } });
    if (targetOpen > 0) throw new BadRequestException('Mesa destino ja tem comanda aberta.');
    return this.prisma.comanda.update({ where: { id: comanda.id }, data: { tableId: toTableId } });
  }

  private async recalcTotal(comandaId: number) {
    const items = await this.prisma.comandaItem.findMany({ where: { comandaId } });
    const total = items.reduce((s, i) => s + i.preco * i.quantidade, 0);
    await this.prisma.comanda.update({ where: { id: comandaId }, data: { total } });
  }

  private async ensureOwner(userId: number, tableId: number) {
    const table = await this.prisma.table.findFirst({ where: { id: tableId, userId } });
    if (!table) throw new NotFoundException('Mesa nao encontrada.');
    return table;
  }
}
