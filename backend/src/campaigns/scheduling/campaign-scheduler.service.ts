import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AgendamentoTipo, CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { nextRunFromCron } from './cron-rule.util';

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private dispatchService: DispatchService,
  ) {}

  @Cron('* * * * *')
  async processScheduledCampaigns(): Promise<{ processed: number }> {
    const now = new Date();

    const due = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: now },
        agendamentoTipo: {
          in: [AgendamentoTipo.SCHEDULED, AgendamentoTipo.RECURRING],
        },
      },
      take: 20,
    });

    // TODO (MVP): single-worker only. In multi-worker cluster, two instances may
    // pick the same campaign before either transitions to SENDING.
    // Fix: SELECT FOR UPDATE or optimistic lock via Campaign.dispatchLockedAt field.

    let processed = 0;

    for (const campaign of due) {
      try {
        const result = await this.dispatchService.sendForScheduled(campaign.id);
        processed++;

        this.logger.log(
          `Campaign ${campaign.id} dispatched: total=${result.totalMessages} sent=${result.sentCount} failed=${result.failedCount}`,
        );

        if (
          campaign.agendamentoTipo === AgendamentoTipo.RECURRING &&
          campaign.recurringCron
        ) {
          const next = nextRunFromCron(campaign.recurringCron, now);
          const endsAt = campaign.recurringEndsAt;

          if (next && (!endsAt || next < endsAt)) {
            await this.prisma.campaign.update({
              where: { id: campaign.id },
              data: { scheduledAt: next, status: CampaignStatus.SCHEDULED },
            });
            this.logger.log(
              `Campaign ${campaign.id} (RECURRING) re-scheduled to ${next.toISOString()}`,
            );
          } else {
            await this.prisma.campaign.update({
              where: { id: campaign.id },
              data: { status: CampaignStatus.COMPLETED },
            });
            this.logger.log(
              `Campaign ${campaign.id} (RECURRING) exhausted — marked COMPLETED`,
            );
          }
        }
        // SCHEDULED (one-time): sendForScheduled already marks COMPLETED
      } catch (e) {
        this.logger.error(
          `Campaign ${campaign.id} scheduled dispatch failed: ${(e as Error).message}`,
        );
        // Reset to SCHEDULED so the next cron iteration can retry.
        // TODO: add exponential backoff / max-retries policy.
        await this.prisma.campaign
          .update({
            where: { id: campaign.id },
            data: { status: CampaignStatus.SCHEDULED },
          })
          .catch(() => undefined);
      }
    }

    return { processed };
  }
}
