import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TriggerType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { CreateTriggerSubscriptionDto } from './dto/create-trigger-subscription.dto';
import { UpdateTriggerSubscriptionDto } from './dto/update-trigger-subscription.dto';
import type { TriggerHandlerMap } from './trigger-registry.module';

@Injectable()
export class TriggerSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly dispatch: DispatchService,
    @Inject('TRIGGER_HANDLERS') private readonly handlers: TriggerHandlerMap,
  ) {}

  async create(
    campaignId: number,
    dto: CreateTriggerSubscriptionDto,
    restaurantId: number,
    accountId: number,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, restaurantId },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    const existing = await this.prisma.triggerSubscription.findUnique({
      where: {
        campaignId_triggerType: {
          campaignId,
          triggerType: dto.triggerType,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Já existe subscription do tipo ${dto.triggerType} para esta campanha.`,
      );
    }

    this.validateConfig(dto.triggerType, dto.triggerConfig ?? {});

    const sub = await this.prisma.triggerSubscription.create({
      data: {
        restaurantId,
        campaignId,
        triggerType: dto.triggerType,
        triggerConfig: (dto.triggerConfig ?? {}) as Prisma.InputJsonValue,
        ativo: dto.ativo ?? true,
      },
    });

    void this.audit.log(
      restaurantId,
      'TRIGGER_SUB_CREATE',
      'TriggerSubscription',
      sub.id,
      { triggerType: dto.triggerType, campaignId },
      accountId,
    );

    return sub;
  }

  async findAll(restaurantId: number, campaignId?: number) {
    return this.prisma.triggerSubscription.findMany({
      where: {
        restaurantId,
        ...(campaignId !== undefined ? { campaignId } : {}),
      },
      include: {
        campaign: { select: { id: true, nome: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const sub = await this.prisma.triggerSubscription.findFirst({
      where: { id, restaurantId },
      include: {
        campaign: { select: { id: true, nome: true, status: true } },
      },
    });
    if (!sub) throw new NotFoundException('Subscription não encontrada.');
    return sub;
  }

  async update(
    id: number,
    dto: UpdateTriggerSubscriptionDto,
    restaurantId: number,
    accountId: number,
  ) {
    const sub = await this.findOne(id, restaurantId);

    if (dto.triggerConfig !== undefined) {
      this.validateConfig(sub.triggerType, dto.triggerConfig);
    }

    const updated = await this.prisma.triggerSubscription.update({
      where: { id },
      data: {
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        ...(dto.triggerConfig !== undefined
          ? { triggerConfig: dto.triggerConfig as Prisma.InputJsonValue }
          : {}),
      },
    });

    void this.audit.log(
      restaurantId,
      'TRIGGER_SUB_UPDATE',
      'TriggerSubscription',
      id,
      dto as Record<string, unknown>,
      accountId,
    );

    return updated;
  }

  async remove(id: number, restaurantId: number, accountId: number) {
    await this.findOne(id, restaurantId);
    await this.prisma.triggerSubscription.delete({ where: { id } });

    void this.audit.log(
      restaurantId,
      'TRIGGER_SUB_DELETE',
      'TriggerSubscription',
      id,
      {},
      accountId,
    );

    return { deleted: true };
  }

  async runNow(id: number, restaurantId: number, accountId: number) {
    const sub = await this.findOne(id, restaurantId);

    const handler = this.handlers[sub.triggerType];
    if (!handler) {
      throw new BadRequestException(
        `Sem handler para o tipo ${sub.triggerType}.`,
      );
    }

    const ids = await handler.findMatches(
      sub.restaurantId,
      sub.triggerConfig as Record<string, unknown>,
    );

    let result = { dispatchId: 0, sentCount: 0, failedCount: 0 };
    if (ids.length > 0) {
      result = await this.dispatch.dispatchToCustomers(sub.campaignId, ids);

      if (sub.triggerType === TriggerType.FIRST_ORDER_PLACED) {
        await this.prisma.customer.updateMany({
          where: { id: { in: ids } },
          data: { firstOrderTriggered: true },
        });
      }
    }

    void this.audit.log(
      restaurantId,
      'TRIGGER_SUB_RUN',
      'TriggerSubscription',
      id,
      { dispatched: ids.length, ...result },
      accountId,
    );

    return { dispatched: ids.length, ...result };
  }

  private validateConfig(
    triggerType: TriggerType,
    config: Record<string, unknown>,
  ): void {
    if (
      triggerType === TriggerType.NO_ORDER_X_DAYS &&
      config.days !== undefined &&
      (typeof config.days !== 'number' || config.days < 1)
    ) {
      throw new BadRequestException(
        'NO_ORDER_X_DAYS: triggerConfig.days deve ser um número >= 1.',
      );
    }

    if (
      triggerType === TriggerType.FIRST_ORDER_ANNIVERSARY &&
      config.years !== undefined &&
      (typeof config.years !== 'number' || config.years < 1)
    ) {
      throw new BadRequestException(
        'FIRST_ORDER_ANNIVERSARY: triggerConfig.years deve ser um número >= 1.',
      );
    }

    if (
      triggerType === TriggerType.FIADO_LIMIT_NEAR &&
      config.thresholdPercent !== undefined &&
      (typeof config.thresholdPercent !== 'number' ||
        config.thresholdPercent < 1 ||
        config.thresholdPercent > 100)
    ) {
      throw new BadRequestException(
        'FIADO_LIMIT_NEAR: triggerConfig.thresholdPercent deve ser 1–100.',
      );
    }
  }
}
