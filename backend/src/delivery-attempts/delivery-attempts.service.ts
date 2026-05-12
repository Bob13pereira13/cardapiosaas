import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryAttemptStatus, OrderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryAttemptDto } from './dto/create-delivery-attempt.dto';
import { UpdateAttemptStatusDto } from './dto/update-attempt-status.dto';

const VALID: Record<DeliveryAttemptStatus, DeliveryAttemptStatus[]> = {
  PENDING: ['IN_TRANSIT', 'CANCELED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED', 'CANCELED'],
  DELIVERED: [],
  FAILED: ['RETRY_SCHEDULED'],
  RETRY_SCHEDULED: [],
  CANCELED: [],
};

@Injectable()
export class DeliveryAttemptsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    restaurantId: number,
    orderId: number,
    dto: CreateDeliveryAttemptDto,
    accountId: number,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true, tabId: true, deliveryType: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.deliveryType !== 'DELIVERY') {
      throw new BadRequestException(
        'Tentativas de entrega só são permitidas para pedidos do tipo DELIVERY',
      );
    }

    const last = await this.prisma.deliveryAttempt.findFirst({
      where: { orderId },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true },
    });
    const attemptNumber = (last?.attemptNumber ?? 0) + 1;

    const attempt = await this.prisma.deliveryAttempt.create({
      data: {
        restaurantId,
        orderId,
        tabId: order.tabId,
        attemptNumber,
        status: 'PENDING',
        assignedTo: dto.assignedTo,
        observacao: dto.observacao,
        createdByAccountId: accountId,
        updatedByAccountId: accountId,
      },
    });

    await this.audit.log(
      restaurantId,
      'CREATE',
      'DeliveryAttempt',
      attempt.id,
      { orderId, attemptNumber },
      accountId,
    );
    return attempt;
  }

  async findByOrder(restaurantId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    return this.prisma.deliveryAttempt.findMany({
      where: { orderId },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const attempt = await this.prisma.deliveryAttempt.findFirst({
      where: { id, restaurantId },
    });
    if (!attempt)
      throw new NotFoundException('Tentativa de entrega não encontrada');
    return attempt;
  }

  async updateStatus(
    id: number,
    restaurantId: number,
    dto: UpdateAttemptStatusDto,
    accountId: number,
  ) {
    const attempt = await this.prisma.deliveryAttempt.findFirst({
      where: { id, restaurantId },
      select: { id: true, status: true, orderId: true, tabId: true },
    });
    if (!attempt)
      throw new NotFoundException('Tentativa de entrega não encontrada');

    const allowed = VALID[attempt.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transição inválida: ${attempt.status} → ${dto.status}`,
      );
    }

    if (dto.status === 'FAILED' && !dto.failureReason) {
      throw new BadRequestException(
        'failureReason é obrigatório para status FAILED',
      );
    }

    const now = new Date();

    if (dto.status === 'DELIVERED') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.deliveryAttempt.update({
          where: { id },
          data: {
            status: 'DELIVERED',
            completedAt: now,
            ...(dto.observacao !== undefined && { observacao: dto.observacao }),
            updatedByAccountId: accountId,
          },
        });

        await tx.order.update({
          where: { id: attempt.orderId },
          data: { orderStatus: OrderStatus.DELIVERED },
        });

        if (attempt.tabId != null) {
          const tab = await tx.tab.findUnique({
            where: { id: attempt.tabId },
            select: { total: true, totalPago: true, status: true },
          });
          if (
            tab &&
            tab.status === 'OPEN' &&
            Number(tab.totalPago) >= Number(tab.total)
          ) {
            await tx.tab.update({
              where: { id: attempt.tabId },
              data: { status: 'CLOSED', closedAt: now },
            });
          }
        }

        await this.audit.log(
          restaurantId,
          'DELIVERED',
          'DeliveryAttempt',
          id,
          { orderId: attempt.orderId, tabId: attempt.tabId },
          accountId,
        );
        return updated;
      });
    }

    const updateData: Record<string, unknown> = {
      status: dto.status,
      updatedByAccountId: accountId,
    };
    if (dto.status === 'IN_TRANSIT') updateData.startedAt = now;
    if (dto.failureReason !== undefined)
      updateData.failureReason = dto.failureReason;
    if (dto.observacao !== undefined) updateData.observacao = dto.observacao;

    const updated = await this.prisma.deliveryAttempt.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log(
      restaurantId,
      `STATUS_${dto.status}`,
      'DeliveryAttempt',
      id,
      { from: attempt.status, to: dto.status },
      accountId,
    );
    return updated;
  }

  async retry(id: number, restaurantId: number, accountId: number) {
    const attempt = await this.prisma.deliveryAttempt.findFirst({
      where: { id, restaurantId },
      select: {
        id: true,
        status: true,
        orderId: true,
        tabId: true,
        attemptNumber: true,
        assignedTo: true,
      },
    });
    if (!attempt)
      throw new NotFoundException('Tentativa de entrega não encontrada');
    if (attempt.status !== 'FAILED') {
      throw new BadRequestException(
        'Apenas tentativas com status FAILED podem ser retentadas',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.deliveryAttempt.update({
        where: { id },
        data: { status: 'RETRY_SCHEDULED', updatedByAccountId: accountId },
      });

      const newAttempt = await tx.deliveryAttempt.create({
        data: {
          restaurantId,
          orderId: attempt.orderId,
          tabId: attempt.tabId,
          attemptNumber: attempt.attemptNumber + 1,
          status: 'PENDING',
          assignedTo: attempt.assignedTo,
          createdByAccountId: accountId,
          updatedByAccountId: accountId,
        },
      });

      await this.audit.log(
        restaurantId,
        'RETRY',
        'DeliveryAttempt',
        newAttempt.id,
        { previousAttemptId: id, attemptNumber: newAttempt.attemptNumber },
        accountId,
      );
      return newAttempt;
    });
  }
}
