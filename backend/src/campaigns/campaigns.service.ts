import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, CampaignTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number) {
    return this.prisma.campaign.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: { coupon: { select: { code: true, type: true, value: true } } },
    });
  }

  async findOne(restaurantId: number, id: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId },
      include: { coupon: { select: { code: true, type: true, value: true } } },
    });
    if (!campaign) throw new NotFoundException('Campanha nao encontrada.');
    return campaign;
  }

  create(
    restaurantId: number,
    dto: {
      nome: string;
      tipo?: string;
      descricao?: string;
      couponId?: number;
    },
  ) {
    return this.prisma.campaign.create({
      data: {
        restaurantId,
        nome: dto.nome,
        tipo: (dto.tipo as CampaignTipo) ?? CampaignTipo.CUPOM,
        descricao: dto.descricao,
        couponId: dto.couponId,
      },
      include: { coupon: { select: { code: true, type: true, value: true } } },
    });
  }

  async update(
    restaurantId: number,
    id: number,
    dto: {
      nome?: string;
      tipo?: string;
      status?: string;
      descricao?: string;
      couponId?: number;
    },
  ) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo as CampaignTipo }),
        ...(dto.status !== undefined && {
          status: dto.status as CampaignStatus,
        }),
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.couponId !== undefined && { couponId: dto.couponId }),
      },
    });
  }

  async remove(restaurantId: number, id: number) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async activate(restaurantId: number, id: number) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'ATIVA' },
    });
  }

  async pause(restaurantId: number, id: number) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSADA' },
    });
  }

  private async ensureOwner(restaurantId: number, id: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId },
    });
    if (!campaign) throw new NotFoundException('Campanha nao encontrada.');
    return campaign;
  }
}
