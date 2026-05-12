import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    restaurantId: number,
    action: string,
    entity: string,
    entityId?: number,
    meta?: Record<string, unknown>,
    accountId?: number,
  ) {
    await this.prisma.auditLog
      .create({
        data: {
          restaurantId,
          accountId,
          action,
          entity,
          entityId,
          meta: meta as Prisma.InputJsonValue | undefined,
        },
      })
      .catch(() => undefined);
  }

  async findAll(
    restaurantId: number,
    params: { action?: string; take?: number; skip?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        restaurantId,
        ...(params.action
          ? { action: { contains: params.action, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      skip: params.skip ?? 0,
    });
  }
}
