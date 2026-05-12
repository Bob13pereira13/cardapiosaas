import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TabPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFiadoPaymentDto } from './dto/create-fiado-payment.dto';
import { QueryFiadoTransactionsDto } from './dto/query-fiado-transactions.dto';
import { UpdateFiadoLimiteDto } from './dto/update-fiado-limite.dto';

@Injectable()
export class FiadoService {
  constructor(private prisma: PrismaService) {}

  private async findCustomer(customerId: number, restaurantId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
      select: { id: true, name: true, fiadoLimite: true, fiadoTotal: true },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  async getFiado(customerId: number, restaurantId: number) {
    const customer = await this.findCustomer(customerId, restaurantId);
    const recentTransactions = await this.prisma.fiadoTransaction.findMany({
      where: { customerId, restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tipo: true,
        valor: true,
        saldoAposTransacao: true,
        observacao: true,
        createdAt: true,
        tabId: true,
        paymentId: true,
      },
    });
    const fiadoLimite = Number(customer.fiadoLimite);
    const fiadoTotal = Number(customer.fiadoTotal);
    return {
      customerId: customer.id,
      customerName: customer.name,
      fiadoLimite,
      fiadoTotal,
      disponivel: fiadoLimite - fiadoTotal,
      recentTransactions,
    };
  }

  async updateFiadoLimite(
    customerId: number,
    restaurantId: number,
    dto: UpdateFiadoLimiteDto,
    accountId: number,
    role: string | null,
  ) {
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new ForbiddenException(
        'Apenas OWNER e MANAGER podem alterar o limite de fiado',
      );
    }
    const customer = await this.findCustomer(customerId, restaurantId);
    const fiadoTotal = Number(customer.fiadoTotal);
    if (dto.fiadoLimite < fiadoTotal) {
      throw new BadRequestException(
        `Limite proposto (R$${dto.fiadoLimite.toFixed(2)}) menor que saldo atual (R$${fiadoTotal.toFixed(2)})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { fiadoLimite: new Prisma.Decimal(dto.fiadoLimite) },
        select: { id: true, name: true, fiadoLimite: true, fiadoTotal: true },
      });
      await tx.auditLog.create({
        data: {
          restaurantId,
          accountId,
          action: 'FIADO_LIMITE_UPDATE',
          entity: 'Customer',
          entityId: customerId,
          meta: {
            fiadoLimiteAnterior: Number(customer.fiadoLimite),
            fiadoLimiteNovo: dto.fiadoLimite,
          },
        },
      });
      return updated;
    });
  }

  async getFiadoTransactions(
    customerId: number,
    restaurantId: number,
    query: QueryFiadoTransactionsDto,
  ) {
    await this.findCustomer(customerId, restaurantId);
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [transactions, total] = await Promise.all([
      this.prisma.fiadoTransaction.findMany({
        where: { customerId, restaurantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          tipo: true,
          valor: true,
          saldoAposTransacao: true,
          observacao: true,
          createdAt: true,
          tabId: true,
          paymentId: true,
        },
      }),
      this.prisma.fiadoTransaction.count({
        where: { customerId, restaurantId },
      }),
    ]);
    return { transactions, total, skip, take };
  }

  async createFiadoPayment(
    customerId: number,
    restaurantId: number,
    dto: CreateFiadoPaymentDto,
    accountId: number,
  ) {
    const customer = await this.findCustomer(customerId, restaurantId);
    const fiadoTotal = Number(customer.fiadoTotal);

    if (dto.valor > fiadoTotal) {
      throw new BadRequestException(
        `Valor de quitação (R$${dto.valor.toFixed(2)}) excede saldo devedor (R$${fiadoTotal.toFixed(2)})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let cashRegisterSessionId: number | null = null;
      if (dto.metodo === TabPaymentMethod.DINHEIRO) {
        const session = await tx.cashRegisterSession.findFirst({
          where: { restaurantId, openedByAccountId: accountId, status: 'OPEN' },
          select: { id: true },
        });
        if (!session) {
          throw new BadRequestException(
            'Abra um caixa antes de receber pagamentos em dinheiro.',
          );
        }
        cashRegisterSessionId = session.id;
      }

      const novoSaldo = fiadoTotal - dto.valor;

      const payment = await tx.payment.create({
        data: {
          restaurantId,
          metodo: dto.metodo,
          valor: new Prisma.Decimal(dto.valor),
          status: 'CONFIRMED',
          recebidoEm: new Date(),
          recebidoPor: accountId,
          cashRegisterSessionId,
          observacao: dto.observacao,
        },
      });

      await tx.fiadoTransaction.create({
        data: {
          restaurantId,
          customerId,
          tipo: 'CREDITO',
          valor: new Prisma.Decimal(dto.valor),
          saldoAposTransacao: new Prisma.Decimal(novoSaldo),
          paymentId: payment.id,
          observacao: dto.observacao ?? `Quitação de fiado`,
          createdByAccountId: accountId,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { fiadoTotal: new Prisma.Decimal(novoSaldo) },
      });

      if (dto.metodo === TabPaymentMethod.DINHEIRO && cashRegisterSessionId) {
        await tx.cashMovement.create({
          data: {
            restaurantId,
            cashRegisterSessionId,
            tipo: 'ENTRADA',
            origem: 'FIADO_QUITACAO',
            valor: new Prisma.Decimal(dto.valor),
            paymentId: payment.id,
            descricao: `Quitação fiado cliente #${customerId}`,
            createdByAccountId: accountId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          restaurantId,
          accountId,
          action: 'FIADO_PAYMENT',
          entity: 'Payment',
          entityId: payment.id,
          meta: { customerId, valor: dto.valor, metodo: dto.metodo, novoSaldo },
        },
      });

      return { payment, novoSaldo };
    });
  }

  async getFiadoSummary(restaurantId: number, role: string | null) {
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new ForbiddenException(
        'Apenas OWNER e MANAGER podem ver o resumo de fiado',
      );
    }
    const [totalResult, totalClientesComFiado, topDevedores] =
      await Promise.all([
        this.prisma.customer.aggregate({
          where: { restaurantId },
          _sum: { fiadoTotal: true },
        }),
        this.prisma.customer.count({
          where: { restaurantId, fiadoTotal: { gt: 0 } },
        }),
        this.prisma.customer.findMany({
          where: { restaurantId, fiadoTotal: { gt: 0 } },
          orderBy: { fiadoTotal: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            phone: true,
            fiadoTotal: true,
            fiadoLimite: true,
          },
        }),
      ]);
    return {
      totalFiadoAberto: Number(totalResult._sum.fiadoTotal ?? 0),
      totalClientesComFiado,
      topDevedores,
    };
  }
}
