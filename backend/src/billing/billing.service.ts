import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasBillingService } from './asaas-billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

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
  ) {}

  async createSubscription(
    userId: number,
    dto: CreateSubscriptionDto,
    requester?: { id: number; role?: string },
    remoteIp?: string,
  ) {
    if (
      requester &&
      requester.role !== UserRole.ADMIN &&
      requester.id !== userId
    ) {
      throw new ForbiddenException('Acesso negado.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: UserRole.RESTAURANT },
    });

    if (!user) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    const customerInput = {
      name: user.nome,
      email: user.email,
      phone: user.whatsapp,
      cpfCnpj: dto.cpfCnpj,
      externalReference: String(user.id),
    };

    const customerId = user.asaasCustomerId
      ? (await this.asaas.updateCustomer(user.asaasCustomerId, customerInput))
          .id
      : (await this.asaas.createCustomer(customerInput)).id;

    const nextDueDate =
      dto.nextDueDate ??
      this.formatDate(
        this.hasActiveTrial(user.trialEndsAt) ? user.trialEndsAt! : new Date(),
      );
    const plan = dto.plan ?? user.plan;
    const billingType = dto.billingType ?? 'PIX';

    if (billingType === 'CREDIT_CARD') {
      if (
        !dto.creditCard ||
        !dto.creditCardHolderInfo ||
        !dto.creditCardHolderInfo.mobilePhone ||
        !remoteIp
      ) {
        throw new BadRequestException(
          'Dados do cartÃ£o, telefone do titular e IP sÃ£o obrigatÃ³rios para assinatura no cartÃ£o.',
        );
      }
    }

    const subscription = await this.asaas.createSubscription({
      customerId,
      billingType,
      value: dto.value,
      nextDueDate,
      description: `Assinatura ${plan} - ${user.nome}`,
      externalReference: String(user.id),
      creditCard: dto.creditCard,
      creditCardHolderInfo: dto.creditCardHolderInfo,
      remoteIp,
    });

    const subscriptionStatus = this.hasActiveTrial(user.trialEndsAt)
      ? SubscriptionStatus.TRIAL
      : SubscriptionStatus.ACTIVE;

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        asaasCustomerId: customerId,
        asaasSubscriptionId: subscription.id,
        plan,
        subscriptionStatus,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        asaasCustomerId: true,
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

    await this.prisma.user.updateMany({
      where: { asaasSubscriptionId: subscriptionId },
      data: { subscriptionStatus },
    });

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
