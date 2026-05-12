import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        gtmId: true,
        ga4MeasurementId: true,
        metaPixelId: true,
        metaAccessToken: true,
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');
    const { metaAccessToken, ...rest } = restaurant;
    return { ...rest, metaAccessTokenConfigured: Boolean(metaAccessToken) };
  }

  async updateSettings(
    restaurantId: number,
    data: {
      gtmId?: string;
      ga4MeasurementId?: string;
      metaPixelId?: string;
      metaAccessToken?: string;
    },
  ) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        gtmId: data.gtmId === '' ? null : data.gtmId,
        ga4MeasurementId:
          data.ga4MeasurementId === '' ? null : data.ga4MeasurementId,
        metaPixelId: data.metaPixelId === '' ? null : data.metaPixelId,
        metaAccessToken:
          data.metaAccessToken === '' ? null : data.metaAccessToken,
      },
      select: { gtmId: true, ga4MeasurementId: true, metaPixelId: true },
    });
  }
}
