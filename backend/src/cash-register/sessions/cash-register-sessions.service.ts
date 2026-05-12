import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashRegisterSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

interface OpenSessionDto {
  name?: string;
  valorInicial: number;
  observacaoAbertura?: string;
}

interface CloseSessionDto {
  valorContado: number;
  observacaoFechamento?: string;
}

interface ListSessionsFilter {
  status?: CashRegisterSessionStatus;
  openedByAccountId?: number;
  skip?: number;
  take?: number;
}

@Injectable()
export class CashRegisterSessionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async open(restaurantId: number, dto: OpenSessionDto, accountId: number) {
    const existing = await this.prisma.cashRegisterSession.findFirst({
      where: { restaurantId, openedByAccountId: accountId, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Você já tem um caixa aberto');
    }

    const session = await this.prisma.cashRegisterSession.create({
      data: {
        restaurantId,
        openedByAccountId: accountId,
        name: dto.name,
        valorInicial: dto.valorInicial,
        observacaoAbertura: dto.observacaoAbertura,
        status: 'OPEN',
      },
      include: {
        openedBy: { select: { id: true, nome: true, email: true } },
      },
    });

    await this.audit.log(
      restaurantId,
      'CASH_SESSION_OPEN',
      'CashRegisterSession',
      session.id,
      { valorInicial: dto.valorInicial, name: dto.name ?? null },
      accountId,
    );

    return session;
  }

  findAll(restaurantId: number, filters: ListSessionsFilter = {}) {
    const where: Prisma.CashRegisterSessionWhereInput = { restaurantId };
    if (filters.status) where.status = filters.status;
    if (filters.openedByAccountId)
      where.openedByAccountId = filters.openedByAccountId;

    return this.prisma.cashRegisterSession.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip: filters.skip ?? 0,
      take: filters.take ?? 50,
      include: {
        openedBy: { select: { id: true, nome: true, email: true } },
        closedBy: { select: { id: true, nome: true, email: true } },
        _count: { select: { cashMovements: true, payments: true } },
      },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id, restaurantId },
      include: {
        openedBy: { select: { id: true, nome: true, email: true } },
        closedBy: { select: { id: true, nome: true, email: true } },
        cashMovements: { orderBy: { createdAt: 'asc' } },
        payments: {
          where: { metodo: 'DINHEIRO' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  getMyActive(restaurantId: number, accountId: number) {
    return this.prisma.cashRegisterSession.findFirst({
      where: { restaurantId, openedByAccountId: accountId, status: 'OPEN' },
      include: {
        openedBy: { select: { id: true, nome: true, email: true } },
        _count: { select: { cashMovements: true } },
      },
    });
  }

  async getReport(id: number, restaurantId: number) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id, restaurantId },
      include: {
        cashMovements: { orderBy: { createdAt: 'asc' } },
        payments: {
          where: { metodo: 'DINHEIRO' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const entradas = session.cashMovements.filter((m) => m.tipo === 'ENTRADA');
    const saidas = session.cashMovements.filter((m) => m.tipo === 'SAIDA');

    const totalEntradas = entradas.reduce((s, m) => s + Number(m.valor), 0);
    const totalSaidas = saidas.reduce((s, m) => s + Number(m.valor), 0);
    const valorEsperado =
      Number(session.valorInicial) + totalEntradas - totalSaidas;

    const sum = (items: typeof entradas) =>
      items.reduce((s, m) => s + Number(m.valor), 0);

    const entradasPorOrigem = {
      PAYMENT_CASH: sum(entradas.filter((m) => m.origem === 'PAYMENT_CASH')),
      FIADO_QUITACAO: sum(
        entradas.filter((m) => m.origem === 'FIADO_QUITACAO'),
      ),
      MANUAL_SUPRIMENTO: sum(
        entradas.filter((m) => m.origem === 'MANUAL_SUPRIMENTO'),
      ),
    };
    const saidasPorOrigem = {
      MANUAL_SANGRIA: sum(saidas.filter((m) => m.origem === 'MANUAL_SANGRIA')),
    };

    return {
      sessionId: session.id,
      status: session.status,
      name: session.name,
      valorInicial: Number(session.valorInicial),
      totalEntradas,
      totalSaidas,
      valorEsperado,
      valorContado:
        session.valorContado !== null ? Number(session.valorContado) : null,
      diferenca: session.diferenca !== null ? Number(session.diferenca) : null,
      entradasPorOrigem,
      saidasPorOrigem,
      movements: session.cashMovements,
      paymentsCash: session.payments,
    };
  }

  async close(
    id: number,
    restaurantId: number,
    dto: CloseSessionDto,
    accountId: number,
    role: string | null,
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id, restaurantId },
      include: { cashMovements: true },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    if (session.status !== 'OPEN') {
      throw new BadRequestException('Sessão já está fechada');
    }

    // CASHIER can only close their own session; OWNER/MANAGER can close anyone's
    if (role === 'CASHIER' && session.openedByAccountId !== accountId) {
      throw new ForbiddenException(
        'Apenas o operador que abriu pode fechar esta sessão',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const entradas = session.cashMovements.filter(
        (m) => m.tipo === 'ENTRADA',
      );
      const saidas = session.cashMovements.filter((m) => m.tipo === 'SAIDA');

      const totalEntradas = entradas.reduce((s, m) => s + Number(m.valor), 0);
      const totalSaidas = saidas.reduce((s, m) => s + Number(m.valor), 0);
      const valorEsperado =
        Number(session.valorInicial) + totalEntradas - totalSaidas;
      const diferenca = dto.valorContado - valorEsperado;

      const updated = await tx.cashRegisterSession.update({
        where: { id },
        data: {
          valorEsperado,
          valorContado: dto.valorContado,
          diferenca,
          status: 'CLOSED',
          closedByAccountId: accountId,
          closedAt: new Date(),
          observacaoFechamento: dto.observacaoFechamento,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId,
          accountId,
          action: 'CASH_SESSION_CLOSE',
          entity: 'CashRegisterSession',
          entityId: id,
          meta: {
            valorContado: dto.valorContado,
            valorEsperado,
            diferenca,
          },
        },
      });

      return updated;
    });
  }
}
