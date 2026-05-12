import { Injectable, Logger } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type WebhookEventType = 'DELIVERED' | 'READ';

export type WebhookResult = { received: boolean; matched: boolean };

@Injectable()
export class ZApiWebhookService {
  private readonly logger = new Logger(ZApiWebhookService.name);

  constructor(private prisma: PrismaService) {}

  async processEvent(
    eventType: WebhookEventType,
    zapiMessageId: string,
  ): Promise<WebhookResult> {
    const message = await this.prisma.campaignMessage.findFirst({
      where: { zapiMessageId },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
        dispatch: { select: { id: true, campaignId: true } },
      },
    });

    if (!message) {
      this.logger.warn(
        `Webhook ${eventType}: zapiMessageId "${zapiMessageId}" not found.`,
      );
      return { received: true, matched: false };
    }

    // Skip terminal / already-advanced states
    const skip: MessageStatus[] = [
      MessageStatus.READ,
      MessageStatus.FAILED,
      MessageStatus.CONVERTED,
    ];
    if (skip.includes(message.status)) {
      return { received: true, matched: true };
    }

    const now = new Date();
    const { id: msgId, dispatch } = message;
    const { id: dispatchId, campaignId } = dispatch;

    if (eventType === 'DELIVERED') {
      if (message.status !== MessageStatus.SENT) {
        return { received: true, matched: true };
      }
      await this.prisma.$transaction([
        this.prisma.campaignMessage.update({
          where: { id: msgId },
          data: { status: MessageStatus.DELIVERED, deliveredAt: now },
        }),
        this.prisma.campaignDispatch.update({
          where: { id: dispatchId },
          data: { deliveredCount: { increment: 1 } },
        }),
        this.prisma.campaign.update({
          where: { id: campaignId },
          data: { statsDelivered: { increment: 1 } },
        }),
      ]);
    } else {
      // READ — covers SENT→READ (assume delivered first) and DELIVERED→READ
      const wasOnlySent = message.status === MessageStatus.SENT;
      await this.prisma.$transaction([
        this.prisma.campaignMessage.update({
          where: { id: msgId },
          data: {
            status: MessageStatus.READ,
            readAt: now,
            // Backfill deliveredAt when jumping SENT→READ
            ...(wasOnlySent ? { deliveredAt: now } : {}),
          },
        }),
        this.prisma.campaignDispatch.update({
          where: { id: dispatchId },
          data: {
            readCount: { increment: 1 },
            ...(wasOnlySent ? { deliveredCount: { increment: 1 } } : {}),
          },
        }),
        this.prisma.campaign.update({
          where: { id: campaignId },
          data: {
            statsRead: { increment: 1 },
            ...(wasOnlySent ? { statsDelivered: { increment: 1 } } : {}),
          },
        }),
      ]);
    }

    return { received: true, matched: true };
  }
}
