import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgendamentoTipo,
  CampaignChannel,
  CampaignStatus,
  CampaignTipo,
  Prisma,
} from '@prisma/client';
import { CronExpressionParser } from 'cron-parser';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    dto: CreateCampaignDto,
    restaurantId: number,
    accountId: number,
  ) {
    if (dto.agendamentoTipo === AgendamentoTipo.TRIGGER) {
      throw new BadRequestException(
        'Campanhas de trigger devem ser criadas via Fase F endpoint. Use IMMEDIATE, SCHEDULED ou RECURRING.',
      );
    }

    if (dto.tipo === CampaignTipo.CUPOM_GENERICO && !dto.couponId) {
      throw new BadRequestException('CUPOM_GENERICO requer couponId.');
    }
    if (dto.tipo === CampaignTipo.MENSAGEM && dto.couponId) {
      throw new BadRequestException(
        'couponId não permitido para tipo MENSAGEM.',
      );
    }

    if (!dto.audienceId) {
      throw new BadRequestException('audienceId é obrigatório.');
    }

    if (dto.agendamentoTipo === AgendamentoTipo.IMMEDIATE && dto.scheduledAt) {
      throw new BadRequestException(
        'scheduledAt não deve ser informado para IMMEDIATE.',
      );
    }

    if (dto.agendamentoTipo === AgendamentoTipo.SCHEDULED) {
      if (!dto.scheduledAt) {
        throw new BadRequestException(
          'scheduledAt é obrigatório para SCHEDULED.',
        );
      }
      if (new Date(dto.scheduledAt) <= new Date()) {
        throw new BadRequestException('scheduledAt deve ser uma data futura.');
      }
    }

    if (dto.agendamentoTipo === AgendamentoTipo.RECURRING) {
      if (!dto.recurringCron) {
        throw new BadRequestException(
          'recurringCron é obrigatório para RECURRING.',
        );
      }
      try {
        CronExpressionParser.parse(dto.recurringCron);
      } catch {
        throw new BadRequestException(
          `recurringCron inválido: "${dto.recurringCron}".`,
        );
      }
    }

    const audience = await this.prisma.audience.findFirst({
      where: { id: dto.audienceId, restaurantId, deletedAt: null },
    });
    if (!audience) throw new NotFoundException('Audience não encontrada.');

    if (dto.couponId) {
      const coupon = await this.prisma.coupon.findFirst({
        where: { id: dto.couponId, restaurantId, active: true },
      });
      if (!coupon) throw new NotFoundException('Cupom não encontrado.');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        restaurantId,
        nome: dto.nome,
        descricao: dto.descricao,
        tipo: dto.tipo,
        channel: dto.channel ?? CampaignChannel.WHATSAPP,
        status: CampaignStatus.DRAFT,
        agendamentoTipo: dto.agendamentoTipo,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        recurringCron: dto.recurringCron ?? null,
        recurringEndsAt: dto.recurringEndsAt
          ? new Date(dto.recurringEndsAt)
          : null,
        audienceId: dto.audienceId,
        couponId: dto.couponId ?? null,
        templateBody: dto.templateBody,
        createdByAccountId: accountId,
      },
    });

    void this.audit.log(
      restaurantId,
      'CAMPAIGN_CREATE',
      'Campaign',
      campaign.id,
      { nome: campaign.nome },
      accountId,
    );

    return campaign;
  }

  async findAll(
    restaurantId: number,
    page = 1,
    limit = 20,
    status?: CampaignStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = { restaurantId };
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { audience: { select: { id: true, nome: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number, restaurantId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId },
      include: {
        audience: true,
        coupon: { select: { id: true, code: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');
    return campaign;
  }

  async update(
    id: number,
    dto: UpdateCampaignDto,
    restaurantId: number,
    accountId: number,
  ) {
    const campaign = await this.findOne(id, restaurantId);

    if (campaign.status === CampaignStatus.SCHEDULED) {
      if (dto.status !== CampaignStatus.CANCELED) {
        throw new BadRequestException(
          'Campanha SCHEDULED: apenas cancelamento é permitido.',
        );
      }
      const updated = await this.prisma.campaign.update({
        where: { id },
        data: { status: CampaignStatus.CANCELED },
      });
      void this.audit.log(
        restaurantId,
        'CAMPAIGN_UPDATE',
        'Campaign',
        id,
        { status: 'CANCELED' },
        accountId,
      );
      return updated;
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Campanha já em execução, não pode editar.',
      );
    }

    if (dto.recurringCron) {
      try {
        CronExpressionParser.parse(dto.recurringCron);
      } catch {
        throw new BadRequestException(
          `recurringCron inválido: "${dto.recurringCron}".`,
        );
      }
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        channel: dto.channel,
        templateBody: dto.templateBody,
        agendamentoTipo: dto.agendamentoTipo,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        recurringCron: dto.recurringCron,
        recurringEndsAt: dto.recurringEndsAt
          ? new Date(dto.recurringEndsAt)
          : undefined,
      },
    });

    void this.audit.log(
      restaurantId,
      'CAMPAIGN_UPDATE',
      'Campaign',
      id,
      { nome: updated.nome },
      accountId,
    );
    return updated;
  }

  async delete(id: number, restaurantId: number, accountId: number) {
    const campaign = await this.findOne(id, restaurantId);

    const deletable: CampaignStatus[] = [
      CampaignStatus.DRAFT,
      CampaignStatus.CANCELED,
    ];
    if (!deletable.includes(campaign.status)) {
      throw new BadRequestException(
        'Apenas campanhas DRAFT ou CANCELED podem ser excluídas.',
      );
    }

    await this.prisma.campaign.delete({ where: { id } });

    void this.audit.log(
      restaurantId,
      'CAMPAIGN_DELETE',
      'Campaign',
      id,
      { nome: campaign.nome },
      accountId,
    );

    return { deleted: true };
  }
}
