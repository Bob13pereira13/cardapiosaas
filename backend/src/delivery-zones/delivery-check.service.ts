import { Injectable, NotFoundException } from '@nestjs/common';
import { GeocodingService } from '../geocoding/geocoding.service';
import { PrismaService } from '../prisma/prisma.service';
import { haversineKm } from './utils/haversine.util';
import { normalizeBairro } from './utils/normalize-bairro.util';

type CanDeliverResult = {
  canDeliver: true;
  zoneName: string;
  tipo: string;
  fretefixo: number;
  tempoEstimadoMin: number;
  distanceKm?: number; // only for RADIUS matches
};

type CannotDeliverResult = {
  canDeliver: false;
  reason: string;
};

export type DeliveryCheckResult = CanDeliverResult | CannotDeliverResult;

@Injectable()
export class DeliveryCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
  ) {}

  async check(slug: string, cepInput: string): Promise<DeliveryCheckResult> {
    // 1. Resolve restaurant by slug
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, aceitaEntrega: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');

    if (!restaurant.aceitaEntrega) {
      return { canDeliver: false, reason: 'Restaurante não aceita delivery' };
    }

    // 2. Validate + lookup CEP
    const normalized = this.geocoding.normalizeCep(cepInput);
    if (!normalized) {
      return { canDeliver: false, reason: 'CEP inválido ou não encontrado' };
    }

    const address = await this.geocoding.lookupCep(cepInput);
    if (!address) {
      return { canDeliver: false, reason: 'CEP inválido ou não encontrado' };
    }

    // 3. Load active zones ordered by prioridade DESC, fretefixo ASC
    const zones = await this.prisma.deliveryZone.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: [{ prioridade: 'desc' }, { fretefixo: 'asc' }],
    });

    // 4. Iterate and match
    const normalizedBairro = normalizeBairro(address.bairro);

    for (const zone of zones) {
      if (zone.tipo === 'BAIRRO_LIST') {
        if (zone.bairros.includes(normalizedBairro)) {
          return {
            canDeliver: true,
            zoneName: zone.name,
            tipo: zone.tipo,
            fretefixo: Number(zone.fretefixo),
            tempoEstimadoMin: zone.tempoEstimadoMin,
          };
        }
      } else if (zone.tipo === 'RADIUS') {
        // Skip if any required coordinate is missing
        if (
          zone.centerLat == null ||
          zone.centerLng == null ||
          zone.radiusKm == null ||
          address.lat == null ||
          address.lng == null
        ) {
          continue;
        }
        const dist = haversineKm(
          zone.centerLat,
          zone.centerLng,
          address.lat,
          address.lng,
        );
        if (dist <= Number(zone.radiusKm)) {
          return {
            canDeliver: true,
            zoneName: zone.name,
            tipo: zone.tipo,
            fretefixo: Number(zone.fretefixo),
            tempoEstimadoMin: zone.tempoEstimadoMin,
            distanceKm: Math.round(dist * 10) / 10,
          };
        }
      }
    }

    return { canDeliver: false, reason: 'Fora da área de entrega' };
  }
}
