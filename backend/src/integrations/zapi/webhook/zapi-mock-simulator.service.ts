import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ZApiClientService } from '../zapi-client.service';
import { ZApiWebhookService } from './zapi-webhook.service';

@Injectable()
export class ZApiMockSimulatorService {
  private readonly logger = new Logger(ZApiMockSimulatorService.name);

  constructor(
    private prisma: PrismaService,
    private zapi: ZApiClientService,
    private webhook: ZApiWebhookService,
  ) {}

  @Cron('*/30 * * * * *')
  async simulateMockEvents(): Promise<{ delivered: number; read: number }> {
    if (!this.zapi.isMockMode) return { delivered: 0, read: 0 };

    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10_000);
    const twentySecondsAgo = new Date(now.getTime() - 20_000);

    // Phase 1: SENT > 10s ago → 80% chance DELIVERED
    const sentMessages = await this.prisma.campaignMessage.findMany({
      where: {
        status: MessageStatus.SENT,
        sentAt: { lt: tenSecondsAgo },
        zapiMessageId: { not: null },
      },
      select: { id: true, zapiMessageId: true },
      take: 50,
    });

    let deliveredCount = 0;
    for (const msg of sentMessages) {
      if (Math.random() < 0.8) {
        await this.webhook.processEvent('DELIVERED', msg.zapiMessageId!);
        deliveredCount++;
      }
    }

    // Phase 2: DELIVERED > 20s ago → 50% chance READ
    const deliveredMessages = await this.prisma.campaignMessage.findMany({
      where: {
        status: MessageStatus.DELIVERED,
        deliveredAt: { lt: twentySecondsAgo },
        zapiMessageId: { not: null },
      },
      select: { id: true, zapiMessageId: true },
      take: 50,
    });

    let readCount = 0;
    for (const msg of deliveredMessages) {
      if (Math.random() < 0.5) {
        await this.webhook.processEvent('READ', msg.zapiMessageId!);
        readCount++;
      }
    }

    if (deliveredCount > 0 || readCount > 0) {
      this.logger.log(
        `Mock simulator: DELIVERED=${deliveredCount} READ=${readCount}`,
      );
    }

    return { delivered: deliveredCount, read: readCount };
  }
}
