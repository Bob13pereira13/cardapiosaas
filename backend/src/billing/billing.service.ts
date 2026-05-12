import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasBillingService } from './asaas-billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { MailService } from '../mail/mail.service';

type AsaasWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    subscription?: string;
    status?: string;
  };
  subscription?: {
    id?: string;
    status?: string;
  };
};

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private asaas: AsaasBillingService,
    private mail: MailService,
  ) {}

  async createSubscription(
    restaurantId: number,
    dto: CreateSubscriptionDto,
    requester?: { id: number; isPlatformAdmin?: boolean },
    remoteIp?: string,
  ) {
    if (
      requester &&
      !requester.isPlatformAdmin &&
      requester.id !== restaurantId
    ) {
      throw new ForbiddenException('Acesso negado.');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        memberships: {
          where: { role: MembershipRole.OWNER, ativo: true },
          include: {
            account: {
              select: {
                id: true,
                nome: true,
                email: true,
                whatsapp: true,
                asaasCustomerId: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!restaurant) throw new NotFoundException('Cliente não encontrado.');
    const ownerAccount = restaurant.memberships[0]?.account;
    if (!ownerAccount) {
      throw new NotFoundException('Conta do proprietário não encontrada.');
    }

    const customerInput = {
      name: ownerAccount.nome,
      email: ownerAccount.email,
      phone: ownerAccount.whatsapp,
      cpfCnpj: dto.cpfCnpj,
      externalReference: String(restaurantId),
    };

    const asaasCustomerId = ownerAccount.asaasCustomerId
      ? (
          await this.asaas.updateCustomer(
            ownerAccount.asaasCustomerId,
            customerInput,
          )
        ).id
      : (await this.asaas.createCustomer(customerInput)).id;

    const nextDueDate =
      dto.nextDueDate ??
      this.formatDate(
        this.hasActiveTrial(restaurant.trialEndsAt)
          ? restaurant.trialEndsAt!
          : new Date(),
      );
    const plan = dto.plan ?? restaurant.plan;
    const billingType = dto.billingType ?? 'PIX';

    if (billingType === 'CREDIT_CARD') {
      if (
        !dto.creditCard ||
        !dto.creditCardHolderInfo ||
        !dto.creditCardHolderInfo.mobilePhone ||
        !remoteIp
      ) {
        throw new BadRequestException(
          'Dados do cartão, telefone do titular e IP são obrigatórios para assinatura no cartão.',
        );
      }
    }

    const subscription = await this.asaas.createSubscription({
      customerId: asaasCustomerId,
      billingType,
      value: dto.value,
      nextDueDate,
      description: `Assinatura ${plan} - ${restaurant.nome}`,
      externalReference: String(restaurantId),
      creditCard: dto.creditCard,
      creditCardHolderInfo: dto.creditCardHolderInfo,
      remoteIp,
    });

    const subscriptionStatus = this.hasActiveTrial(restaurant.trialEndsAt)
      ? SubscriptionStatus.TRIAL
      : SubscriptionStatus.ACTIVE;

    await this.prisma.account.update({
      where: { id: ownerAccount.id },
      data: { asaasCustomerId },
    });

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        asaasSubscriptionId: subscription.id,
        plan,
        subscriptionStatus,
      },
      select: {
        id: true,
        nome: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        asaasSubscriptionId: true,
      },
    });
  }

  async handleAsaasWebhook(
    token: string | undefined,
    body: AsaasWebhookPayload,
  ) {
    this.validateWebhookToken(token);

    const subscriptionId = body.payment?.subscription ?? body.subscription?.id;
    if (!subscriptionId) {
      return { received: true, ignored: true };
    }

    const subscriptionStatus = this.mapWebhookStatus(body);
    if (!subscriptionStatus) {
      return { received: true, ignored: true };
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
      include: {
        memberships: {
          where: { role: MembershipRole.OWNER, ativo: true },
          include: { account: { select: { email: true, nome: true } } },
          take: 1,
        },
      },
    });

    await this.prisma.restaurant.updateMany({
      where: { asaasSubscriptionId: subscriptionId },
      data: { subscriptionStatus },
    });

    if (restaurant) {
      const ownerAccount = restaurant.memberships[0]?.account;
      const email = ownerAccount?.email;
      const nome = ownerAccount?.nome ?? restaurant.nome;

      if (email) {
        if (subscriptionStatus === SubscriptionStatus.ACTIVE) {
          const nextBilling = this.formatDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          );
          void this.mail
            .sendSubscriptionConfirmed(
              email,
              nome,
              restaurant.plan ?? 'básico',
              nextBilling,
            )
            .catch(() => undefined);
        } else if (subscriptionStatus === SubscriptionStatus.CANCELED) {
          void this.mail
            .sendSubscriptionCanceled(email, nome)
            .catch(() => undefined);
        } else if (subscriptionStatus === SubscriptionStatus.OVERDUE) {
          void this.mail.sendPaymentFailed(email, nome).catch(() => undefined);
        }
      }
    }

    return { received: true };
  }

  private validateWebhookToken(token: string | undefined) {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (expectedToken && token !== expectedToken) {
      throw new ForbiddenException('Webhook invalido.');
    }
  }

  private mapWebhookStatus(body: AsaasWebhookPayload) {
    switch (body.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        return SubscriptionStatus.ACTIVE;
      case 'PAYMENT_OVERDUE':
        return SubscriptionStatus.OVERDUE;
      case 'PAYMENT_DELETED':
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        return SubscriptionStatus.CANCELED;
      default:
        return undefined;
    }
  }

  private hasActiveTrial(trialEndsAt: Date | null) {
    return Boolean(trialEndsAt && trialEndsAt.getTime() > Date.now());
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
