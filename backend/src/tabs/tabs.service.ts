import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TabStatus, TabTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTabDto {
  tipo: TabTipo;
  tableId?: number;
  customerId?: number;
  customerNome?: string;
  numeroComandaFisica?: string;
  openedByAccountId?: number;
}

interface UpdateTabDto {
  tableId?: number | null;
  customerId?: number | null;
  customerNome?: string | null;
  numeroComandaFisica?: string | null;
  taxaServico?: number | null;
}

interface ListTabsFilter {
  status?: TabStatus;
  tipo?: TabTipo;
  tableId?: number;
  openedAfter?: string;
  openedBefore?: string;
}

@Injectable()
export class TabsService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number, filters: ListTabsFilter = {}) {
    const where: Prisma.TabWhereInput = { restaurantId };

    if (filters.status) where.status = filters.status;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.tableId) where.tableId = filters.tableId;
    if (filters.openedAfter || filters.openedBefore) {
      where.openedAt = {};
      if (filters.openedAfter)
        where.openedAt.gte = new Date(filters.openedAfter);
      if (filters.openedBefore)
        where.openedAt.lte = new Date(filters.openedBefore);
    }

    return this.prisma.tab.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        table: { select: { id: true, numero: true, nome: true } },
        customer: { select: { id: true, name: true, phone: true } },
        _count: { select: { orders: true, payments: true } },
      },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const tab = await this.prisma.tab.findFirst({
      where: { id, restaurantId },
      include: {
        table: { select: { id: true, numero: true, nome: true } },
        customer: { select: { id: true, name: true, phone: true } },
        orders: {
          include: {
            items: {
              include: {
                product: { select: { id: true, nome: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!tab) throw new NotFoundException('Tab não encontrada');
    return tab;
  }

  async create(dto: CreateTabDto, restaurantId: number) {
    if (dto.tableId && dto.tipo === 'SALAO') {
      const existing = await this.prisma.tab.findFirst({
        where: { restaurantId, tableId: dto.tableId, status: 'OPEN' },
      });
      if (existing) {
        throw new ConflictException(
          `Mesa já possui comanda aberta (Tab id=${existing.id})`,
        );
      }
    }

    return this.prisma.tab.create({
      data: {
        restaurantId,
        tipo: dto.tipo,
        tableId: dto.tableId,
        customerId: dto.customerId,
        customerNome: dto.customerNome,
        numeroComandaFisica: dto.numeroComandaFisica,
        openedByAccountId: dto.openedByAccountId,
      },
    });
  }

  async update(id: number, dto: UpdateTabDto, restaurantId: number) {
    const tab = await this.findOne(id, restaurantId);
    if (tab.status !== 'OPEN') {
      throw new BadRequestException('Só é possível editar tabs abertas');
    }

    if (dto.tableId !== undefined && dto.tableId !== null) {
      const conflict = await this.prisma.tab.findFirst({
        where: {
          restaurantId,
          tableId: dto.tableId,
          status: 'OPEN',
          NOT: { id },
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Mesa já possui comanda aberta (Tab id=${conflict.id})`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tab.update({
        where: { id },
        data: {
          tableId: dto.tableId,
          customerId: dto.customerId,
          customerNome: dto.customerNome,
          numeroComandaFisica: dto.numeroComandaFisica,
          taxaServico:
            dto.taxaServico !== undefined
              ? dto.taxaServico !== null
                ? new Prisma.Decimal(dto.taxaServico)
                : null
              : undefined,
        },
      });

      if (dto.taxaServico !== undefined) {
        await this.recalculateTotals(id, tx);
      }

      return updated;
    });
  }

  async close(id: number, restaurantId: number, closedByAccountId?: number) {
    const tab = await this.findOne(id, restaurantId);
    if (tab.status === 'CLOSED') {
      throw new BadRequestException('Tab já está fechada');
    }
    if (tab.status === 'CANCELED') {
      throw new BadRequestException('Tab cancelada não pode ser fechada');
    }

    return this.prisma.tab.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByAccountId: closedByAccountId,
      },
    });
  }

  async cancel(
    id: number,
    restaurantId: number,
    motivo: string,
    closedByAccountId?: number,
  ) {
    const tab = await this.findOne(id, restaurantId);
    if (tab.status === 'CANCELED') {
      throw new BadRequestException('Tab já está cancelada');
    }
    if (tab.status === 'CLOSED') {
      throw new BadRequestException('Tab fechada não pode ser cancelada');
    }

    const confirmedCount = await this.prisma.payment.count({
      where: { tabId: id, status: 'CONFIRMED' },
    });
    if (confirmedCount > 0) {
      throw new BadRequestException(
        'Tab possui pagamentos confirmados. Faça o estorno antes de cancelar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { tabId: id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });

      await tx.order.updateMany({
        where: { tabId: id, orderStatus: { not: 'CANCELED' } },
        data: { orderStatus: 'CANCELED', canceledAt: new Date() },
      });

      return tx.tab.update({
        where: { id },
        data: {
          status: 'CANCELED',
          closedAt: new Date(),
          closedByAccountId: closedByAccountId,
          descontoManualMotivo: motivo,
        },
      });
    });
  }

  async recalculateTotals(tabId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const tab = await client.tab.findUnique({
      where: { id: tabId },
      include: {
        orders: { include: { items: true } },
        payments: true,
      },
    });

    if (!tab) throw new NotFoundException('Tab não encontrada');

    const subtotal = tab.orders.reduce(
      (acc, o) => acc + o.items.reduce((s, i) => s + Number(i.itemTotal), 0),
      0,
    );

    const deliveryTotal = tab.orders.reduce(
      (acc, o) => acc + Number(o.deliveryFee ?? 0),
      0,
    );

    const taxa = Number(tab.taxaServico ?? 0);
    const desconto = Number(tab.descontoManualValor ?? 0);
    const total = Math.max(0, subtotal + deliveryTotal + taxa - desconto);

    const totalPago = tab.payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((acc, p) => acc + Number(p.valor), 0);

    await client.tab.update({
      where: { id: tabId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(total),
        totalPago: new Prisma.Decimal(totalPago),
      },
    });

    return { subtotal, total, totalPago };
  }

  async applyDiscount(
    id: number,
    restaurantId: number,
    valor: number,
    motivo: string,
    appliedByAccountId: number,
  ) {
    const tab = await this.findOne(id, restaurantId);
    if (tab.status !== 'OPEN') {
      throw new BadRequestException(
        'Só é possível aplicar desconto em tabs abertas',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.tab.update({
        where: { id },
        data: {
          descontoManualValor: new Prisma.Decimal(valor),
          descontoManualMotivo: motivo,
          descontoManualPor: appliedByAccountId,
        },
      });

      return this.recalculateTotals(id, tx);
    });
  }

  async transferTable(
    id: number,
    restaurantId: number,
    newTableId: number,
    accountId: number,
  ) {
    const tab = await this.findOne(id, restaurantId);
    if (tab.status !== 'OPEN') {
      throw new BadRequestException('Só é possível transferir tabs abertas');
    }

    const newTable = await this.prisma.table.findFirst({
      where: { id: newTableId, restaurantId },
      select: { id: true },
    });
    if (!newTable) {
      throw new NotFoundException('Mesa de destino não encontrada');
    }

    const conflict = await this.prisma.tab.findFirst({
      where: { restaurantId, tableId: newTableId, status: 'OPEN', NOT: { id } },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        `Mesa já possui comanda aberta (Tab id=${conflict.id})`,
      );
    }

    const fromTableId = tab.tableId;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tab.update({
        where: { id },
        data: { tableId: newTableId },
      });

      await tx.auditLog.create({
        data: {
          restaurantId,
          accountId,
          action: 'TAB_TABLE_TRANSFER',
          entity: 'Tab',
          entityId: id,
          meta: { fromTableId, toTableId: newTableId },
        },
      });

      return updated;
    });
  }
}
