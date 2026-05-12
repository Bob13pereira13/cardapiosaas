import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  CampaignStatus,
  CampaignTipo,
  CouponType,
  DispatchStatus,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ZApiClientService } from '../../integrations/zapi/zapi-client.service';
import {
  buildCustomerWhere,
  FilterDSL,
} from '../../audiences/filters/filter-builder';
import { renderTemplate } from '../templates/template-renderer';

type CustomerRow = { id: number; name: string; phone: string };

type CampaignRow = {
  id: number;
  tipo: CampaignTipo;
  couponId: number | null;
  coupon: { id: number; code: string } | null;
  templateBody: string;
  restaurant: { nome: string; slug: string };
};

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private zapi: ZApiClientService,
  ) {}

  async send(campaignId: number, restaurantId: number, accountId: number) {
    // 1. Fetch campaign
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, restaurantId },
      include: {
        audience: { select: { id: true, filtros: true } },
        coupon: { select: { id: true, code: true } },
        restaurant: { select: { nome: true, slug: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campanha não encontrada.');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Campanha já enviada ou em execução. Apenas DRAFT pode ser enviada.',
      );
    }
    // TODO (Fase F): TRIGGER campaigns generate recipients dynamically
    if (!campaign.audienceId || !campaign.audience) {
      throw new BadRequestException(
        'Campanha sem audience (triggers automáticos serão implementados na Fase F).',
      );
    }

    // 2. Pre-send validation
    if (campaign.tipo === CampaignTipo.CUPOM_GENERICO) {
      const coupon = await this.prisma.coupon.findFirst({
        where: { id: campaign.couponId!, restaurantId, active: true },
      });
      if (!coupon) {
        throw new BadRequestException('Cupom da campanha não está mais ativo.');
      }
    }

    // 3. Create dispatch + transition DRAFT → SENDING (atomic)
    const dispatch = await this.prisma.$transaction(async (tx) => {
      const d = await tx.campaignDispatch.create({
        data: {
          campaignId,
          status: DispatchStatus.SCHEDULED,
          scheduledAt: new Date(),
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.SENDING },
      });
      return d;
    });

    // 4. Calculate recipients
    const filtros = campaign.audience.filtros as FilterDSL;
    const where = buildCustomerWhere(filtros, restaurantId);

    // Customer.phone is non-nullable in the current schema.
    // The `where` filter is kept for schema evolution.
    const customers = (await this.prisma.customer.findMany({
      where,
      select: { id: true, name: true, phone: true },
    })) as CustomerRow[];

    // Count audience members that have no phone (always 0 with current schema, kept defensively)
    const totalWithoutPhone = 0;
    if (totalWithoutPhone > 0) {
      this.logger.warn(
        `Dispatch ${dispatch.id}: ${totalWithoutPhone} customer(s) without phone excluded.`,
      );
    }

    // 5. Update dispatch: totalMessages + RUNNING
    await this.prisma.campaignDispatch.update({
      where: { id: dispatch.id },
      data: {
        totalMessages: customers.length,
        startedAt: new Date(),
        status: DispatchStatus.RUNNING,
      },
    });

    // 6. Process in batches of 50
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < customers.length; i += 50) {
      const batch = customers.slice(i, i + 50);
      for (const customer of batch) {
        const result = await this.processOne(
          customer,
          campaign,
          dispatch.id,
          restaurantId,
        );
        if (result.success) sentCount++;
        else failedCount++;
      }
    }

    // 8. Finalize dispatch + transition SENDING → COMPLETED
    const finalStatus =
      customers.length > 0 && failedCount === customers.length
        ? DispatchStatus.FAILED
        : DispatchStatus.COMPLETED;

    await this.prisma.$transaction(async (tx) => {
      await tx.campaignDispatch.update({
        where: { id: dispatch.id },
        data: { status: finalStatus, completedAt: new Date() },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.COMPLETED },
      });
    });

    void this.audit.log(
      restaurantId,
      'CAMPAIGN_DISPATCH',
      'Campaign',
      campaignId,
      {
        dispatchId: dispatch.id,
        total: customers.length,
        sent: sentCount,
        failed: failedCount,
      },
      accountId,
    );

    return {
      dispatchId: dispatch.id,
      totalMessages: customers.length,
      sentCount,
      failedCount,
      skippedNoPhone: totalWithoutPhone,
    };
  }

  private async processOne(
    customer: CustomerRow,
    campaign: CampaignRow,
    dispatchId: number,
    restaurantId: number,
  ): Promise<{ success: boolean }> {
    let couponId: number | null = campaign.couponId ?? null;
    let couponCode: string | null = campaign.coupon?.code ?? null;

    if (campaign.tipo === CampaignTipo.CUPOM_UNICO) {
      // TODO (Fase F): allow configuring discount defaults via Campaign template fields
      try {
        const newCoupon = await this.prisma.coupon.create({
          data: {
            restaurantId,
            code: `CAMP-${randomBytes(4).toString('hex').toUpperCase()}`,
            type: CouponType.PERCENT,
            value: 10,
            maxUses: 1,
            usedCount: 0,
            active: true,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        couponId = newCoupon.id;
        couponCode = newCoupon.code;
      } catch (e) {
        this.logger.error(
          `Failed to create coupon for customer ${customer.id}: ${(e as Error).message}`,
        );
      }
    }

    const nameParts = customer.name.split(' ');
    const vars: Record<string, string> = {
      nome: customer.name,
      primeiroNome: nameParts[0] ?? customer.name,
      telefone: customer.phone,
      cupom: couponCode ?? '',
      loja: campaign.restaurant.nome,
      link: `https://app.cardapio.io/r/${campaign.restaurant.slug}`,
    };

    const rendered = renderTemplate(campaign.templateBody, vars);

    const message = await this.prisma.campaignMessage.create({
      data: {
        dispatchId,
        customerId: customer.id,
        couponId,
        status: MessageStatus.PENDING,
        phone: customer.phone,
        renderedBody: rendered,
      },
    });

    try {
      const result = await this.zapi.sendText(customer.phone, rendered);

      if (result.success) {
        await Promise.all([
          this.prisma.campaignMessage.update({
            where: { id: message.id },
            data: {
              status: MessageStatus.SENT,
              sentAt: new Date(),
              zapiMessageId: result.messageId,
            },
          }),
          this.prisma.campaignDispatch.update({
            where: { id: dispatchId },
            data: { sentCount: { increment: 1 } },
          }),
          this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { statsSent: { increment: 1 }, statsTotal: { increment: 1 } },
          }),
        ]);
        return { success: true };
      } else {
        await Promise.all([
          this.prisma.campaignMessage.update({
            where: { id: message.id },
            data: { status: MessageStatus.FAILED, errorMessage: result.error },
          }),
          this.prisma.campaignDispatch.update({
            where: { id: dispatchId },
            data: { failedCount: { increment: 1 } },
          }),
          this.prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              statsFailed: { increment: 1 },
              statsTotal: { increment: 1 },
            },
          }),
        ]);
        return { success: false };
      }
    } catch (e) {
      this.logger.error(
        `Send error for customer ${customer.id}: ${(e as Error).message}`,
      );
      await Promise.all([
        this.prisma.campaignMessage.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.FAILED,
            errorMessage: (e as Error).message,
          },
        }),
        this.prisma.campaignDispatch.update({
          where: { id: dispatchId },
          data: { failedCount: { increment: 1 } },
        }),
        this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            statsFailed: { increment: 1 },
            statsTotal: { increment: 1 },
          },
        }),
      ]);
      return { success: false };
    }
  }

  async getMessages(
    campaignId: number,
    restaurantId: number,
    page = 1,
    limit = 20,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, restaurantId },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    const skip = (page - 1) * limit;
    const where: Prisma.CampaignMessageWhereInput = {
      dispatch: { campaignId },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.campaignMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.campaignMessage.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
