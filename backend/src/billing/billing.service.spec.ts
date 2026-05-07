import { ForbiddenException } from '@nestjs/common';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasBillingService } from './asaas-billing.service';
import { BillingService } from './billing.service';
import { MailService } from '../mail/mail.service';

describe('BillingService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const asaas = {
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
  };
  const mail = {
    sendSubscriptionConfirmed: jest.fn().mockResolvedValue(undefined),
    sendSubscriptionCanceled: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
  };

  let service: BillingService;
  const originalWebhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BillingService(
      prisma as unknown as PrismaService,
      asaas as unknown as AsaasBillingService,
      mail as unknown as MailService,
    );
  });

  afterAll(() => {
    process.env.ASAAS_WEBHOOK_TOKEN = originalWebhookToken;
  });

  it('creates an Asaas customer and monthly subscription for a restaurant', async () => {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    prisma.user.findFirst.mockResolvedValue({
      id: 10,
      role: UserRole.RESTAURANT,
      nome: 'Restaurante Teste',
      email: 'teste@example.com',
      whatsapp: '11999999999',
      plan: 'PRO',
      trialEndsAt,
      asaasCustomerId: null,
    });
    asaas.createCustomer.mockResolvedValue({ id: 'cus_123' });
    asaas.createSubscription.mockResolvedValue({ id: 'sub_123' });
    prisma.user.update.mockResolvedValue({
      id: 10,
      asaasCustomerId: 'cus_123',
      asaasSubscriptionId: 'sub_123',
      subscriptionStatus: SubscriptionStatus.TRIAL,
    });

    await service.createSubscription(10, {
      cpfCnpj: '12345678901',
      value: 99.9,
      plan: 'PRO',
      billingType: 'PIX',
    });

    expect(asaas.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ cpfCnpj: '12345678901' }),
    );
    expect(asaas.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_123',
        billingType: 'PIX',
        value: 99.9,
        externalReference: '10',
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('updates subscription status from Asaas payment webhook', async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';

    await service.handleAsaasWebhook('secret-token', {
      event: 'PAYMENT_OVERDUE',
      payment: { subscription: 'sub_123' },
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { asaasSubscriptionId: 'sub_123' },
      data: { subscriptionStatus: SubscriptionStatus.OVERDUE },
    });
  });

  it('rejects webhook with invalid token', async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';

    await expect(
      service.handleAsaasWebhook('wrong-token', {
        event: 'PAYMENT_CONFIRMED',
        payment: { subscription: 'sub_123' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
