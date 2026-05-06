import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { coupon: { select: { code: true, type: true, value: true } } },
    });
  }

  async findOne(userId: number, id: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
      include: { coupon: { select: { code: true, type: true, value: true } } },
    });
    if (!campaign) throw new NotFoundException('Campanha nao encontrada.');
    return campaign;
  }

  create(userId: number, dto: {
    nome: string;
    tipo?: string;
    descricao?: string;
    couponId?: number;
  }) {
    return this.prisma.campaign.create({
      data: {
        userId,
        nome: dto.nome,
        tipo: (dto.tipo as any) ?? 'CUPOM',
        descricao: dto.descricao,
        couponId: dto.couponId,
      },
      include: { coupon: { select: { code: true, type: true, value: true } } },
    });
  }

  async update(userId: number, id: number, dto: {
    nome?: string;
    tipo?: string;
    status?: string;
    descricao?: string;
    couponId?: number;
  }) {
    await this.ensureOwner(userId, id);
    return this.prisma.campaign.update({ where: { id }, data: dto as any });
  }

  async remove(userId: number, id: number) {
    await this.ensureOwner(userId, id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async activate(userId: number, id: number) {
    await this.ensureOwner(userId, id);
    return this.prisma.campaign.update({ where: { id }, data: { status: 'ATIVA' } });
  }

  async pause(userId: number, id: number) {
    await this.ensureOwner(userId, id);
    return this.prisma.campaign.update({ where: { id }, data: { status: 'PAUSADA' } });
  }

  private async ensureOwner(userId: number, id: number) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) throw new NotFoundException('Campanha nao encontrada.');
    return campaign;
  }
}
