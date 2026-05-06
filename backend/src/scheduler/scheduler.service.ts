import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  @Cron('0 9 * * *')
  async sendTrialEndingEmails() {
    const now = new Date();
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const startOf1 = new Date(in1Day); startOf1.setHours(0, 0, 0, 0);
    const endOf1 = new Date(in1Day); endOf1.setHours(23, 59, 59, 999);
    const startOf3 = new Date(in3Days); startOf3.setHours(0, 0, 0, 0);
    const endOf3 = new Date(in3Days); endOf3.setHours(23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.RESTAURANT,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: {
          gte: startOf1,
          lte: endOf3,
        },
      },
      select: { email: true, nome: true, trialEndsAt: true },
    });

    for (const user of users) {
      const msLeft = user.trialEndsAt!.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      try {
        await this.mail.sendTrialEnding(user.email, user.nome, daysLeft);
      } catch {
        this.logger.warn(`Failed to send trial ending email to ${user.email}`);
      }
    }

    this.logger.log(`Trial ending emails sent to ${users.length} users`);
  }

  @Cron('0 10 * * *')
  async sendNpsEmails() {
    const restaurants = await this.prisma.user.findMany({
      where: { npsEnabled: true },
      select: { id: true, npsDaysAfterOrder: true, urlPublica: true, slug: true },
    });

    for (const restaurant of restaurants) {
      const cutoff = new Date(
        Date.now() - restaurant.npsDaysAfterOrder * 24 * 60 * 60 * 1000,
      );
      const start = new Date(cutoff); start.setHours(0, 0, 0, 0);
      const end = new Date(cutoff); end.setHours(23, 59, 59, 999);

      const orders = await this.prisma.order.findMany({
        where: {
          userId: restaurant.id,
          orderStatus: OrderStatus.DELIVERED,
          npsRequested: false,
          deliveredAt: { gte: start, lte: end },
        },
      });

      for (const order of orders) {
        if (!order.customerPhone.includes('@')) continue;
        const base = restaurant.urlPublica ?? `https://cardapiopedeai.com.br/cardapio/${restaurant.slug}`;
        const npsUrl = `${base}/avaliacao/${order.id}`;
        try {
          await this.mail.sendNpsRequest(order.customerPhone, order.customerName, order.orderNumber, npsUrl);
          await this.prisma.order.update({ where: { id: order.id }, data: { npsRequested: true } });
        } catch {
          this.logger.warn(`NPS email failed for order ${order.id}`);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireTrials() {
    const result = await this.prisma.user.updateMany({
      where: {
        role: UserRole.RESTAURANT,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: { lt: new Date() },
      },
      data: { subscriptionStatus: SubscriptionStatus.OVERDUE },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} trials → OVERDUE`);
    }
  }
}
