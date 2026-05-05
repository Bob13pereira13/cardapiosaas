import { BadRequestException, Injectable } from '@nestjs/common';

type AsaasCustomerResponse = {
  id: string;
};

type AsaasSubscriptionResponse = {
  id: string;
};

type CreateCustomerInput = {
  name: string;
  email: string;
  phone?: string | null;
  cpfCnpj: string;
  externalReference: string;
};

type CreateSubscriptionInput = {
  customerId: string;
  billingType: 'PIX' | 'CREDIT_CARD';
  value: number;
  nextDueDate: string;
  description: string;
  externalReference: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string | null;
    phone?: string | null;
    mobilePhone?: string | null;
  };
  remoteIp?: string;
};

@Injectable()
export class AsaasBillingService {
  private get baseUrl() {
    return process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
  }

  private get apiKey() {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('ASAAS_API_KEY nao configurada.');
    }
    return apiKey;
  }

  async createCustomer(input: CreateCustomerInput) {
    return this.request<AsaasCustomerResponse>('/customers', {
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      externalReference: input.externalReference,
    });
  }

  async updateCustomer(customerId: string, input: CreateCustomerInput) {
    return this.request<AsaasCustomerResponse>(
      `/customers/${customerId}`,
      {
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
        externalReference: input.externalReference,
      },
      'PUT',
    );
  }

  async createSubscription(input: CreateSubscriptionInput) {
    const body: Record<string, unknown> = {
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      nextDueDate: input.nextDueDate,
      cycle: 'MONTHLY',
      description: input.description,
      externalReference: input.externalReference,
    };

    if (input.billingType === 'CREDIT_CARD') {
      body.creditCard = input.creditCard;
      body.creditCardHolderInfo = input.creditCardHolderInfo;
      body.remoteIp = input.remoteIp;
    }

    return this.request<AsaasSubscriptionResponse>('/subscriptions', body);
  }

  private async request<T>(
    path: string,
    body: Record<string, unknown>,
    method: 'POST' | 'PUT' = 'POST',
  ) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as T | null;

    if (!response.ok || !data) {
      throw new BadRequestException({
        message: 'Erro ao comunicar com Asaas.',
        status: response.status,
        details: data,
      });
    }

    return data;
  }
}
