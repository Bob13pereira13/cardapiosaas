import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildCustomerWhere, FilterDSL } from './filters/filter-builder';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';

@Injectable()
export class AudiencesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    dto: CreateAudienceDto,
    restaurantId: number,
    accountId: number,
  ) {
    buildCustomerWhere(dto.filtros, restaurantId);

    const audience = await this.prisma.audience.create({
      data: {
        restaurantId,
        nome: dto.nome,
        descricao: dto.descricao,
        filtros: dto.filtros as unknown as Prisma.InputJsonObject,
        createdByAccountId: accountId,
      },
    });

    const withSize = await this.recalculateSize(audience.id, restaurantId);

    void this.audit.log(
      restaurantId,
      'AUDIENCE_CREATE',
      'Audience',
      audience.id,
      { nome: audience.nome },
      accountId,
    );

    return withSize;
  }

  async findAll(restaurantId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.AudienceWhereInput = { restaurantId, deletedAt: null };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.audience.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.audience.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number, restaurantId: number) {
    const audience = await this.prisma.audience.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });
    if (!audience) throw new NotFoundException('Público não encontrado.');
    return audience;
  }

  async update(
    id: number,
    dto: UpdateAudienceDto,
    restaurantId: number,
    accountId: number,
  ) {
    const existing = await this.findOne(id, restaurantId);

    if (dto.filtros != null) {
      buildCustomerWhere(dto.filtros, restaurantId);
    }

    await this.prisma.audience.update({
      where: { id },
      data: {
        nome: dto.nome ?? existing.nome,
        descricao:
          dto.descricao !== undefined ? dto.descricao : existing.descricao,
        filtros:
          dto.filtros != null
            ? (dto.filtros as unknown as Prisma.InputJsonObject)
            : (existing.filtros as Prisma.InputJsonObject),
      },
    });

    const updated = await this.recalculateSize(id, restaurantId);

    void this.audit.log(
      restaurantId,
      'AUDIENCE_UPDATE',
      'Audience',
      id,
      { nome: updated.nome },
      accountId,
    );

    return updated;
  }

  async delete(id: number, restaurantId: number, accountId: number) {
    await this.findOne(id, restaurantId);

    // TODO(Fase B): verificar se audience está em uso por Campaign ativa antes de deletar.
    // const activeUsage = await this.prisma.campaign.count({
    //   where: { audienceId: id, status: { in: ['DRAFT', 'SCHEDULED', 'SENDING'] } },
    // });
    // if (activeUsage > 0) throw new BadRequestException('Público em uso por campanha ativa.');

    const deleted = await this.prisma.audience.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    void this.audit.log(
      restaurantId,
      'AUDIENCE_DELETE',
      'Audience',
      id,
      {},
      accountId,
    );

    return deleted;
  }

  async preview(id: number, restaurantId: number) {
    const audience = await this.findOne(id, restaurantId);
    const filtros = audience.filtros as FilterDSL;
    const where = buildCustomerWhere(filtros, restaurantId);

    const [totalCount, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        take: 20,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          totalSpent: true,
          lastOrderAt: true,
        },
      }),
    ]);

    return { audience, totalCount, customers };
  }

  async recalculateSize(audienceId: number, restaurantId: number) {
    const audience = await this.prisma.audience.findFirst({
      where: { id: audienceId, restaurantId, deletedAt: null },
    });
    if (!audience) throw new NotFoundException('Público não encontrado.');

    const filtros = audience.filtros as FilterDSL;
    const where = buildCustomerWhere(filtros, restaurantId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const count = await tx.customer.count({ where });
      return tx.audience.update({
        where: { id: audienceId },
        data: { estimatedSize: count, lastEstimateAt: new Date() },
      });
    });

    void this.audit.log(
      restaurantId,
      'AUDIENCE_RECALCULATE',
      'Audience',
      audienceId,
      { estimatedSize: updated.estimatedSize },
    );

    return updated;
  }
}
