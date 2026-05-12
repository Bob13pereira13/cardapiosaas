import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

function getRange(period: Period, dateFrom?: string, dateTo?: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'WEEK') start.setDate(start.getDate() - 6);
  if (period === 'MONTH') start.setDate(start.getDate() - 29);
  if ((period === 'CUSTOM' || dateFrom) && dateFrom) {
    const d = new Date(dateFrom);
    d.setHours(0, 0, 0, 0);
    start.setTime(d.getTime());
  }
  const end = dateTo ? new Date(dateTo) : new Date(now);
  if (dateTo) end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

@Injectable()
export class NpsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(restaurantId: number) {
    const responses = await this.prisma.npsResponse.findMany({
      where: { restaurantId },
      select: { score: true },
    });

    const total = responses.length;
    if (total === 0)
      return { averageScore: 0, totalResponses: 0, distribution: {} };

    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) distribution[i] = 0;
    let sum = 0;
    for (const r of responses) {
      sum += r.score;
      distribution[r.score] = (distribution[r.score] ?? 0) + 1;
    }

    return {
      averageScore: Math.round((sum / total) * 10) / 10,
      totalResponses: total,
      distribution,
    };
  }

  async getResponses(
    restaurantId: number,
    params: {
      period?: Period;
      score?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const createdAt = getRange(
      params.period ?? 'MONTH',
      params.dateFrom,
      params.dateTo,
    );
    const where: Prisma.NpsResponseWhereInput = { restaurantId, createdAt };
    if (params.score) where.score = params.score;

    return this.prisma.npsResponse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });
  }

  async reply(restaurantId: number, id: number, replyText: string) {
    const response = await this.prisma.npsResponse.findFirst({
      where: { id, restaurantId },
    });
    if (!response) throw new NotFoundException('Avaliacao nao encontrada.');

    return this.prisma.npsResponse.update({
      where: { id },
      data: { reply: replyText, repliedAt: new Date() },
    });
  }
}
