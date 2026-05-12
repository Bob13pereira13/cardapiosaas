import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number) {
    return this.prisma.table.findMany({
      where: { restaurantId },
      orderBy: { numero: 'asc' },
    });
  }

  async create(
    restaurantId: number,
    dto: { numero: number; nome?: string; capacidade?: number },
  ) {
    const exists = await this.prisma.table.findFirst({
      where: { restaurantId, numero: dto.numero },
    });
    if (exists)
      throw new BadRequestException('Ja existe uma mesa com esse numero.');
    return this.prisma.table.create({
      data: {
        restaurantId,
        ...dto,
      },
    });
  }

  async update(
    restaurantId: number,
    id: number,
    dto: {
      numero?: number;
      nome?: string;
      capacidade?: number;
      ativa?: boolean;
    },
  ) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async remove(restaurantId: number, id: number) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.table.delete({ where: { id } });
  }

  async getQrCodeUrl(restaurantId: number, tableId: number): Promise<string> {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId },
    });
    if (!table) throw new NotFoundException('Mesa não encontrada');
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });
    const appUrl = process.env.APP_URL ?? 'https://cardapiopedeai.com.br';
    return `${appUrl}/cardapio/${restaurant!.slug}?mesa=${table.numero}`;
  }

  private async ensureOwner(restaurantId: number, tableId: number) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId },
    });
    if (!table) throw new NotFoundException('Mesa nao encontrada.');
    return table;
  }
}
