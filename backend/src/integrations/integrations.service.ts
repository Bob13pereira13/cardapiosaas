import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        gtmId: true,
        ga4MeasurementId: true,
        metaPixelId: true,
        metaAccessToken: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const { metaAccessToken, ...rest } = user;
    return { ...rest, metaAccessTokenConfigured: Boolean(metaAccessToken) };
  }

  async updateSettings(
    userId: number,
    data: { gtmId?: string; ga4MeasurementId?: string; metaPixelId?: string; metaAccessToken?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        gtmId: data.gtmId === '' ? null : data.gtmId,
        ga4MeasurementId: data.ga4MeasurementId === '' ? null : data.ga4MeasurementId,
        metaPixelId: data.metaPixelId === '' ? null : data.metaPixelId,
        metaAccessToken: data.metaAccessToken === '' ? null : data.metaAccessToken,
      },
      select: { gtmId: true, ga4MeasurementId: true, metaPixelId: true },
    });
  }
}
