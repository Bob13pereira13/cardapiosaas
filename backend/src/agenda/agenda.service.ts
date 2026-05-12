import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AgendamentoStatus, AgendamentoTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  findAll(
    restaurantId: number,
    filters: { dataHoraFrom?: string; dataHoraTo?: string; status?: string },
  ) {
    const where: Prisma.AgendamentoWhereInput = { restaurantId };
    if (filters.status) where.status = filters.status as AgendamentoStatus;
    if (filters.dataHoraFrom || filters.dataHoraTo) {
      const range: Prisma.DateTimeFilter = {};
      if (filters.dataHoraFrom) range.gte = new Date(filters.dataHoraFrom);
      if (filters.dataHoraTo) range.lte = new Date(filters.dataHoraTo);
      where.dataHora = range;
    }
    return this.prisma.agendamento.findMany({
      where,
      orderBy: { dataHora: 'asc' },
      include: { customer: { select: { name: true, phone: true } } },
    });
  }

  create(
    restaurantId: number,
    dto: {
      dataHora: string;
      tipo?: string;
      descricao?: string;
      obs?: string;
      customerId?: number;
      total?: number;
    },
  ) {
    return this.prisma.agendamento.create({
      data: {
        restaurantId,
        dataHora: new Date(dto.dataHora),
        tipo: (dto.tipo as AgendamentoTipo) ?? AgendamentoTipo.RESERVA,
        descricao: dto.descricao,
        obs: dto.obs,
        customerId: dto.customerId,
        total: dto.total,
      },
      include: { customer: { select: { name: true, phone: true } } },
    });
  }

  async update(
    restaurantId: number,
    id: number,
    dto: {
      dataHora?: string;
      tipo?: string;
      status?: string;
      descricao?: string;
      obs?: string;
      customerId?: number;
      total?: number;
    },
  ) {
    await this.ensureOwner(restaurantId, id);
    const data: Prisma.AgendamentoUpdateInput = {};
    if (dto.dataHora) data.dataHora = new Date(dto.dataHora);
    if (dto.tipo !== undefined) data.tipo = dto.tipo as AgendamentoTipo;
    if (dto.status !== undefined) data.status = dto.status as AgendamentoStatus;
    if (dto.descricao !== undefined) data.descricao = dto.descricao;
    if (dto.obs !== undefined) data.obs = dto.obs;
    if (dto.total !== undefined) data.total = dto.total;
    if (dto.customerId !== undefined)
      data.customer = dto.customerId
        ? { connect: { id: dto.customerId } }
        : { disconnect: true };
    return this.prisma.agendamento.update({ where: { id }, data });
  }

  async remove(restaurantId: number, id: number) {
    await this.ensureOwner(restaurantId, id);
    return this.prisma.agendamento.delete({ where: { id } });
  }

  private async ensureOwner(restaurantId: number, id: number) {
    const item = await this.prisma.agendamento.findFirst({
      where: { id, restaurantId },
    });
    if (!item) throw new NotFoundException('Agendamento nao encontrado.');
    return item;
  }
}
