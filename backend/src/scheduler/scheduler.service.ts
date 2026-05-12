import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MembershipRole,
  OrderStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  @Cron('0 9 * * *')
  async sendTrialEndingEmails() {
    const now = new Date();
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const startOf1 = new Date(in1Day);
    startOf1.setHours(0, 0, 0, 0);
    const endOf1 = new Date(in1Day);
    endOf1.setHours(23, 59, 59, 999);
    const startOf3 = new Date(in3Days);
    startOf3.setHours(0, 0, 0, 0);
    const endOf3 = new Date(in3Days);
    endOf3.setHours(23, 59, 59, 999);

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: {
          gte: startOf1,
          lte: endOf3,
        },
      },
      include: {
        memberships: {
          where: { role: MembershipRole.OWNER, ativo: true },
          include: { account: { select: { email: true, nome: true } } },
          take: 1,
        },
      },
    });

    for (const restaurant of restaurants) {
      const owner = restaurant.memberships[0]?.account;
      if (!owner) continue;
      const msLeft = restaurant.trialEndsAt!.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      try {
        await this.mail.sendTrialEnding(owner.email, owner.nome, daysLeft);
      } catch {
        this.logger.warn(`Failed to send trial ending email to ${owner.email}`);
      }
    }

    this.logger.log(
      `Trial ending emails sent to ${restaurants.length} restaurants`,
    );
  }

  @Cron('0 10 * * *')
  async sendNpsEmails() {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { npsEnabled: true },
      select: {
        id: true,
        npsDaysAfterOrder: true,
        urlPublica: true,
        slug: true,
      },
    });

    for (const restaurant of restaurants) {
      const cutoff = new Date(
        Date.now() - restaurant.npsDaysAfterOrder * 24 * 60 * 60 * 1000,
      );
      const start = new Date(cutoff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(cutoff);
      end.setHours(23, 59, 59, 999);

      const orders = await this.prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          orderStatus: OrderStatus.DELIVERED,
          npsRequested: false,
          deliveredAt: { gte: start, lte: end },
        },
      });

      for (const order of orders) {
        if (!order.customerPhone.includes('@')) continue;
        const base =
          restaurant.urlPublica ??
          `https://cardapiopedeai.com.br/cardapio/${restaurant.slug}`;
        const npsUrl = `${base}/avaliacao/${order.id}`;
        try {
          await this.mail.sendNpsRequest(
            order.customerPhone,
            order.customerName,
            order.orderNumber,
            npsUrl,
          );
          await this.prisma.order.update({
            where: { id: order.id },
            data: { npsRequested: true },
          });
        } catch {
          this.logger.warn(`NPS email failed for order ${order.id}`);
        }
      }
    }
  }

  @Cron('0 10 * * *')
  async sendCartAbandonmentEmails() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const records = await this.prisma.cartAbandonment.findMany({
      where: { notified: false, createdAt: { lt: twoHoursAgo } },
    });

    const restaurantIds = [
      ...new Set(
        records
          .map((r) => r.restaurantId)
          .filter((id): id is number => id !== null),
      ),
    ];
    const restaurants = await this.prisma.restaurant.findMany({
      where: { id: { in: restaurantIds } },
      select: { id: true, slug: true, urlPublica: true },
    });
    const restaurantMap = new Map(restaurants.map((r) => [r.id, r]));

    for (const record of records) {
      const email =
        record.phone && record.phone.includes('@') ? record.phone : null;
      const restaurant =
        record.restaurantId != null
          ? restaurantMap.get(record.restaurantId)
          : undefined;
      const base =
        restaurant?.urlPublica ??
        `https://cardapiopedeai.com.br/cardapio/${restaurant?.slug ?? ''}`;

      if (email) {
        try {
          await this.mail.sendCartAbandonment(email, 'Cliente', base);
        } catch {
          this.logger.warn(
            `Cart abandonment email failed for record ${record.id}`,
          );
        }
      }

      await this.prisma.cartAbandonment.update({
        where: { id: record.id },
        data: { notified: true, notifiedAt: new Date() },
      });
    }

    if (records.length > 0) {
      this.logger.log(`Cart abandonment processed: ${records.length} records`);
    }
  }

  @Cron('*/30 * * * *')
  async enforceProductAvailability() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const products = await this.prisma.product.findMany({
      where: { availabilities: { some: {} } },
      select: {
        id: true,
        availabilities: true,
      },
    });

    let updated = 0;
    for (const product of products) {
      const inWindow = product.availabilities.some(
        (a) =>
          a.dayOfWeek === currentDay &&
          a.startTime <= currentTime &&
          a.endTime >= currentTime,
      );
      await this.prisma.product.update({
        where: { id: product.id },
        data: { disponivel: inWindow },
      });
      updated++;
    }

    if (updated > 0) {
      this.logger.log(
        `Product availability enforced: ${updated} products updated`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireTrials() {
    const result = await this.prisma.restaurant.updateMany({
      where: {
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
