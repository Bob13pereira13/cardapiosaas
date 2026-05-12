import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Payment, Prisma, TabPaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TabsService } from '../tabs.service';

interface CreatePaymentDto {
  metodo: TabPaymentMethod;
  valor: number;
  trocoEm?: number;
  appliesToOrderItemIds?: number[];
  observacao?: string;
  pixTransactionId?: string;
  cardLast4?: string;
  cardBrand?: string;
}

@Injectable()
export class TabPaymentsService {
  constructor(
    private prisma: PrismaService,
    private tabsService: TabsService,
  ) {}

  async findByTab(tabId: number, restaurantId: number) {
    await this.tabsService.findOne(tabId, restaurantId);
    return this.prisma.payment.findMany({
      where: { tabId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    tabId: number,
    restaurantId: number,
    dto: CreatePaymentDto,
    accountId?: number,
  ) {
    const tab = await this.tabsService.findOne(tabId, restaurantId);
    if (tab.status !== 'OPEN') {
      throw new BadRequestException(
        'Não é possível adicionar pagamento a uma tab fechada ou cancelada',
      );
    }

    // ── FIADO path ────────────────────────────────────────────────────────────
    if (dto.metodo === 'FIADO') {
      if (!tab.customerId) {
        throw new BadRequestException(
          'Pagamento FIADO requer customer identificado na Tab',
        );
      }

      const customer = await this.prisma.customer.findUnique({
        where: { id: tab.customerId },
        select: { id: true, fiadoTotal: true, fiadoLimite: true },
      });
      if (!customer) {
        throw new BadRequestException(
          'Pagamento FIADO requer customer identificado na Tab',
        );
      }

      const novoSaldo = Number(customer.fiadoTotal) + dto.valor;
      if (novoSaldo > Number(customer.fiadoLimite)) {
        throw new BadRequestException(
          `Limite de fiado excedido (saldo R$${Number(customer.fiadoTotal).toFixed(2)}, limite R$${Number(customer.fiadoLimite).toFixed(2)}, tentativa R$${dto.valor.toFixed(2)})`,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            restaurantId,
            tabId,
            metodo: 'FIADO',
            valor: new Prisma.Decimal(dto.valor),
            status: 'CONFIRMED',
            recebidoEm: new Date(),
            recebidoPor: accountId,
            observacao: dto.observacao,
          },
        });

        await tx.fiadoTransaction.create({
          data: {
            restaurantId,
            customerId: customer.id,
            tipo: 'DEBITO',
            valor: new Prisma.Decimal(dto.valor),
            saldoAposTransacao: new Prisma.Decimal(novoSaldo),
            tabId,
            paymentId: payment.id,
            observacao: `Pagamento Tab #${tabId} em fiado`,
            createdByAccountId: accountId!,
          },
        });

        await tx.customer.update({
          where: { id: customer.id },
          data: { fiadoTotal: new Prisma.Decimal(novoSaldo) },
        });

        const totals = await this.tabsService.recalculateTotals(tabId, tx);
        if (totals.totalPago >= totals.total && totals.total > 0) {
          await tx.tab.update({
            where: { id: tabId },
            data: { status: 'CLOSED', closedAt: new Date() },
          });
        }

        return payment;
      });
    }
    // ── end FIADO path ────────────────────────────────────────────────────────

    const confirmedAggregate = await this.prisma.payment.aggregate({
      where: { tabId, status: 'CONFIRMED' },
      _sum: { valor: true },
    });
    const confirmedTotal = Number(confirmedAggregate._sum.valor ?? 0);

    const tabTotal = Number(tab.total);
    const tolerance = 0.01;
    // só valida cap quando a tab já tem total calculado (tem orders)
    if (tabTotal > 0 && confirmedTotal + dto.valor > tabTotal + tolerance) {
      throw new BadRequestException(
        `Soma dos pagamentos (R$${(confirmedTotal + dto.valor).toFixed(2)}) excede o total da tab (R$${tabTotal.toFixed(2)})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          restaurantId,
          tabId,
          metodo: dto.metodo,
          valor: new Prisma.Decimal(dto.valor),
          trocoEm: dto.trocoEm != null ? new Prisma.Decimal(dto.trocoEm) : null,
          appliesToOrderItemIds: dto.appliesToOrderItemIds ?? [],
          observacao: dto.observacao,
          pixTransactionId: dto.pixTransactionId,
          cardLast4: dto.cardLast4,
          cardBrand: dto.cardBrand,
          recebidoPor: accountId,
        },
      });

      await this.tabsService.recalculateTotals(tabId, tx);
      return payment;
    });
  }

  async confirm(
    paymentId: number,
    tabId: number,
    restaurantId: number,
    accountId?: number,
  ) {
    await this.tabsService.findOne(tabId, restaurantId);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tabId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.status === 'CONFIRMED') {
      throw new BadRequestException('Pagamento já está confirmado');
    }

    return this.prisma.$transaction(async (tx) => {
      // ── DINHEIRO: requer sessão de caixa aberta ──────────────────────────
      let cashRegisterSessionId: number | null = null;
      if (payment.metodo === 'DINHEIRO') {
        if (!accountId) {
          throw new BadRequestException(
            'Abra um caixa antes de receber pagamentos em dinheiro.',
          );
        }
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
      // ── end DINHEIRO check ───────────────────────────────────────────────

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          recebidoEm: new Date(),
          recebidoPor: accountId ?? payment.recebidoPor,
          cashRegisterSessionId,
        },
      });

      // ── DINHEIRO: auto-cria CashMovement ────────────────────────────────
      if (payment.metodo === 'DINHEIRO' && cashRegisterSessionId) {
        await tx.cashMovement.create({
          data: {
            restaurantId,
            cashRegisterSessionId,
            tipo: 'ENTRADA',
            origem: 'PAYMENT_CASH',
            valor: payment.valor,
            paymentId: payment.id,
            descricao: `Pagamento Tab #${tabId}`,
            createdByAccountId: accountId!,
          },
        });
      }
      // ── end CashMovement auto-create ─────────────────────────────────────

      const totals = await this.tabsService.recalculateTotals(tabId, tx);

      // auto-fechar tab quando totalPago >= total
      if (totals.totalPago >= totals.total && totals.total > 0) {
        await tx.tab.update({
          where: { id: tabId },
          data: { status: 'CLOSED', closedAt: new Date() },
        });
      }

      return updated;
    });
  }

  async refund(paymentId: number, tabId: number, restaurantId: number) {
    await this.tabsService.findOne(tabId, restaurantId);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tabId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Só é possível estornar pagamentos confirmados',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      // reabrir tab se estava fechada
      await tx.tab.update({
        where: { id: tabId },
        data: { status: 'OPEN', closedAt: null },
      });

      await this.tabsService.recalculateTotals(tabId, tx);
      return updated;
    });
  }

  async remove(paymentId: number, tabId: number, restaurantId: number) {
    await this.tabsService.findOne(tabId, restaurantId);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tabId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException(
        'Só é possível excluir pagamentos pendentes',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });
      await this.tabsService.recalculateTotals(tabId, tx);
      return { ok: true };
    });
  }

  async splitEqual(
    tabId: number,
    restaurantId: number,
    n: number,
    metodo: TabPaymentMethod,
    accountId?: number,
  ) {
    if (!Number.isInteger(n) || n < 2) {
      throw new BadRequestException(
        'Split deve ser entre pelo menos 2 pessoas',
      );
    }

    const tab = await this.tabsService.findOne(tabId, restaurantId);
    if (tab.status !== 'OPEN') {
      throw new BadRequestException('Só é possível dividir tabs abertas');
    }

    const totalCents = Math.round(Number(tab.total) * 100);
    if (totalCents <= 0) {
      throw new BadRequestException('Tab não possui total a dividir');
    }

    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents - baseCents * n;

    return this.prisma.$transaction(async (tx) => {
      const payments: Payment[] = [];
      for (let i = 0; i < n; i++) {
        const valorCents = i === n - 1 ? baseCents + remainderCents : baseCents;
        const p = await tx.payment.create({
          data: {
            restaurantId,
            tabId,
            metodo,
            valor: new Prisma.Decimal(valorCents / 100),
            status: 'PENDING',
            recebidoPor: accountId,
          },
        });
        payments.push(p);
      }
      await this.tabsService.recalculateTotals(tabId, tx);
      return payments;
    });
  }

  async splitByItems(
    tabId: number,
    restaurantId: number,
    splits: Array<{
      metodo: TabPaymentMethod;
      valor: number;
      appliesToOrderItemIds: number[];
      observacao?: string;
    }>,
    accountId?: number,
  ) {
    if (!splits || splits.length === 0) {
      throw new BadRequestException('Splits não podem ser vazios');
    }

    const tab = await this.tabsService.findOne(tabId, restaurantId);
    if (tab.status !== 'OPEN') {
      throw new BadRequestException('Só é possível dividir tabs abertas');
    }

    // Collect all OrderItem IDs in this Tab
    const allItemIds = new Set<number>();
    for (const order of tab.orders) {
      for (const item of order.items) {
        allItemIds.add(item.id);
      }
    }

    if (allItemIds.size === 0) {
      throw new BadRequestException('Tab não possui itens para dividir');
    }

    // Validate sum(splits.valor) ≈ Tab.total
    const splitTotal = splits.reduce((sum, s) => sum + s.valor, 0);
    const tabTotal = Number(tab.total);
    if (Math.abs(splitTotal - tabTotal) > 0.01) {
      throw new BadRequestException(
        `Soma dos splits (R$${splitTotal.toFixed(2)}) não confere com total da Tab (R$${tabTotal.toFixed(2)})`,
      );
    }

    // Validate no duplicate item IDs and all items covered
    const coveredIds = new Set<number>();
    for (const split of splits) {
      for (const itemId of split.appliesToOrderItemIds) {
        if (!allItemIds.has(itemId)) {
          throw new BadRequestException(
            `OrderItem ${itemId} não pertence a esta Tab`,
          );
        }
        if (coveredIds.has(itemId)) {
          throw new BadRequestException(
            `OrderItem ${itemId} aparece em mais de um split`,
          );
        }
        coveredIds.add(itemId);
      }
    }

    for (const itemId of allItemIds) {
      if (!coveredIds.has(itemId)) {
        throw new BadRequestException(
          `OrderItem ${itemId} não está coberto por nenhum split`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const payments: Payment[] = [];
      for (const split of splits) {
        const p = await tx.payment.create({
          data: {
            restaurantId,
            tabId,
            metodo: split.metodo,
            valor: new Prisma.Decimal(split.valor),
            status: 'PENDING',
            appliesToOrderItemIds: split.appliesToOrderItemIds,
            observacao: split.observacao,
            recebidoPor: accountId,
          },
        });
        payments.push(p);
      }
      await this.tabsService.recalculateTotals(tabId, tx);
      return payments;
    });
  }
}
