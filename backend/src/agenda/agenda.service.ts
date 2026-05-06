import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number, filters: { dataHoraFrom?: string; dataHoraTo?: string; status?: string }) {
    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.dataHoraFrom || filters.dataHoraTo) {
      where.dataHora = {};
      if (filters.dataHoraFrom) where.dataHora.gte = new Date(filters.dataHoraFrom);
      if (filters.dataHoraTo) where.dataHora.lte = new Date(filters.dataHoraTo);
    }
    return this.prisma.agendamento.findMany({
      where,
      orderBy: { dataHora: 'asc' },
      include: { customer: { select: { name: true, phone: true } } },
    });
  }

  create(userId: number, dto: {
    dataHora: string;
    tipo?: string;
    descricao?: string;
    obs?: string;
    customerId?: number;
    total?: number;
  }) {
    return this.prisma.agendamento.create({
      data: {
        userId,
        dataHora: new Date(dto.dataHora),
        tipo: (dto.tipo as any) ?? 'RESERVA',
        descricao: dto.descricao,
        obs: dto.obs,
        customerId: dto.customerId,
        total: dto.total,
      },
      include: { customer: { select: { name: true, phone: true } } },
    });
  }

  async update(userId: number, id: number, dto: {
    dataHora?: string;
    tipo?: string;
    status?: string;
    descricao?: string;
    obs?: string;
    customerId?: number;
    total?: number;
  }) {
    await this.ensureOwner(userId, id);
    const data: any = { ...dto };
    if (dto.dataHora) data.dataHora = new Date(dto.dataHora);
    return this.prisma.agendamento.update({ where: { id }, data });
  }

  async remove(userId: number, id: number) {
    await this.ensureOwner(userId, id);
    return this.prisma.agendamento.delete({ where: { id } });
  }

  private async ensureOwner(userId: number, id: number) {
    const item = await this.prisma.agendamento.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Agendamento nao encontrado.');
    return item;
  }
}
