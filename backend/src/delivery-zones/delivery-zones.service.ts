import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { normalizeBairro } from './utils/normalize-bairro.util';

@Injectable()
export class DeliveryZonesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll(restaurantId: number) {
    return this.prisma.deliveryZone.findMany({
      where: { restaurantId, isActive: true },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: number, restaurantId: number) {
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { id, restaurantId },
    });
    if (!zone) throw new NotFoundException('Zona de entrega não encontrada');
    return zone;
  }

  async create(
    restaurantId: number,
    dto: CreateDeliveryZoneDto,
    accountId: number,
  ) {
    // ── Cross-type validation ──────────────────────────────────────
    // Decisão: REJEITA payload misto (campos do tipo errado).
    if (dto.tipo === 'BAIRRO_LIST') {
      if (
        dto.radiusKm != null ||
        dto.centerLat != null ||
        dto.centerLng != null
      ) {
        throw new BadRequestException(
          'BAIRRO_LIST não aceita radiusKm/centerLat/centerLng',
        );
      }
    }

    if (dto.tipo === 'RADIUS') {
      // TODO #1: Habilitar RADIUS quando integrar geocoding pago (Google Geocoding API)
      throw new BadRequestException(
        'Zonas por raio (km) requerem geocoding pago, que ainda não está integrado. ' +
          'Use zonas por BAIRRO_LIST ou aguarde integração com Google Geocoding.',
      );
    }

    // ── Normaliza bairros (lowercase + trim + remove acentos) ──────
    const normalizedBairros =
      dto.tipo === 'BAIRRO_LIST'
        ? [...new Set((dto.bairros ?? []).map(normalizeBairro))]
        : [];

    // ── Warning de prioridade duplicada ───────────────────────────
    const prioridade = dto.prioridade ?? 0;
    let warning: string | undefined;
    const conflicting = await this.prisma.deliveryZone.findFirst({
      where: { restaurantId, isActive: true, prioridade },
      select: { id: true, name: true },
    });
    if (conflicting) {
      warning = `Prioridade ${prioridade} já está em uso pela zona '${conflicting.name}'`;
    }

    const zone = await this.prisma.deliveryZone.create({
      data: {
        restaurantId,
        name: dto.name,
        tipo: dto.tipo,
        bairros: normalizedBairros,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusKm: dto.radiusKm,
        fretefixo: new Prisma.Decimal(dto.fretefixo),
        tempoEstimadoMin: dto.tempoEstimadoMin,
        prioridade,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log(
      restaurantId,
      'DELIVERY_ZONE_CREATE',
      'DeliveryZone',
      zone.id,
      { name: dto.name, tipo: dto.tipo },
      accountId,
    );

    return warning ? { ...zone, warning } : zone;
  }

  async update(
    id: number,
    dto: UpdateDeliveryZoneDto,
    restaurantId: number,
    accountId: number,
  ) {
    const existing = await this.findOne(id, restaurantId);

    // ── Tipo resultante após merge ─────────────────────────────────
    const tipo = dto.tipo ?? existing.tipo;

    // ── Cross-type validation sobre estado resultante ──────────────
    if (tipo === 'BAIRRO_LIST') {
      const bairroCandidates = dto.bairros ?? [...existing.bairros];
      if (bairroCandidates.length === 0) {
        throw new BadRequestException(
          'bairros não pode ser vazio para BAIRRO_LIST',
        );
      }
      if (
        dto.radiusKm != null ||
        dto.centerLat != null ||
        dto.centerLng != null
      ) {
        throw new BadRequestException(
          'BAIRRO_LIST não aceita radiusKm/centerLat/centerLng',
        );
      }
    }

    if (tipo === 'RADIUS') {
      // TODO #1: Habilitar RADIUS quando integrar geocoding pago (Google Geocoding API)
      throw new BadRequestException(
        'Zonas por raio (km) requerem geocoding pago, que ainda não está integrado. ' +
          'Use zonas por BAIRRO_LIST ou aguarde integração com Google Geocoding.',
      );
    }

    // ── Normaliza bairros se atualizados ──────────────────────────
    const bairrosUpdate =
      dto.bairros !== undefined && tipo === 'BAIRRO_LIST'
        ? { bairros: [...new Set(dto.bairros.map(normalizeBairro))] }
        : {};

    // ── Warning de prioridade duplicada ───────────────────────────
    let warning: string | undefined;
    if (dto.prioridade != null && dto.prioridade !== existing.prioridade) {
      const conflict = await this.prisma.deliveryZone.findFirst({
        where: {
          restaurantId,
          isActive: true,
          prioridade: dto.prioridade,
          NOT: { id },
        },
        select: { id: true, name: true },
      });
      if (conflict) {
        warning = `Prioridade ${dto.prioridade} já está em uso pela zona '${conflict.name}'`;
      }
    }

    const updated = await this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.fretefixo !== undefined
          ? { fretefixo: new Prisma.Decimal(dto.fretefixo) }
          : {}),
        ...(dto.tempoEstimadoMin !== undefined
          ? { tempoEstimadoMin: dto.tempoEstimadoMin }
          : {}),
        ...(dto.prioridade !== undefined ? { prioridade: dto.prioridade } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.centerLat !== undefined ? { centerLat: dto.centerLat } : {}),
        ...(dto.centerLng !== undefined ? { centerLng: dto.centerLng } : {}),
        ...(dto.radiusKm !== undefined ? { radiusKm: dto.radiusKm } : {}),
        ...bairrosUpdate,
      },
    });

    await this.audit.log(
      restaurantId,
      'DELIVERY_ZONE_UPDATE',
      'DeliveryZone',
      id,
      { changes: dto },
      accountId,
    );

    return warning ? { ...updated, warning } : updated;
  }

  async remove(id: number, restaurantId: number, accountId: number) {
    const zone = await this.findOne(id, restaurantId);

    await this.prisma.deliveryZone.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log(
      restaurantId,
      'DELIVERY_ZONE_DELETE',
      'DeliveryZone',
      id,
      { name: zone.name },
      accountId,
    );
    // TODO: hard delete quando Order.deliveryZoneId Int? for adicionado (Etapa B+)
  }
}
