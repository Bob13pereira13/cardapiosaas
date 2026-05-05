import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

type AsaasCustomerResponse = { id: string };
type AsaasPaymentResponse = { id: string };
type AsaasPixQrCodeResponse = {
  encodedImage: string;
  payload: string;
  expirationDate: string;
};

export type PixChargeResult = {
  paymentId: string;
  pixQrCode: string;
  pixCopyPaste: string;
};

@Injectable()
export class AsaasPaymentService {
  private readonly logger = new Logger(AsaasPaymentService.name);

  private get baseUrl() {
    return process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3';
  }

  private get apiKey() {
    const key = process.env.ASAAS_API_KEY;
    if (!key)
      throw new BadGatewayException(
        'Pagamento online indisponível. Configure ASAAS_API_KEY.',
      );
    return key;
  }

  async createPixCharge(opts: {
    customerDocument: string;
    customerName: string;
    customerPhone: string;
    orderId: number;
    orderNumber: number;
    restaurantName: string;
    value: number;
  }): Promise<PixChargeResult> {
    const customerDocument = opts.customerDocument.replace(/\D/g, '');
    if (customerDocument.length !== 11 && customerDocument.length !== 14) {
      throw new BadRequestException(
        'CPF/CNPJ Ã© obrigatÃ³rio para pagamento Pix online.',
      );
    }

    const customerPhone = opts.customerPhone.replace(/[^\d+]/g, '');
    const customer = await this.post<AsaasCustomerResponse>('/customers', {
      name: opts.customerName,
      cpfCnpj: customerDocument,
      phone: customerPhone,
      mobilePhone: customerPhone,
      externalReference: `order-payer-${opts.orderId}`,
    });

    const dueDate = this.tomorrow();

    const payment = await this.post<AsaasPaymentResponse>('/payments', {
      customer: customer.id,
      billingType: 'PIX',
      value: opts.value,
      dueDate,
      description: `Pedido #${opts.orderNumber} — ${opts.restaurantName}`,
      externalReference: `order:${opts.orderId}`,
    });

    const qrCode = await this.get<AsaasPixQrCodeResponse>(
      `/payments/${payment.id}/pixQrCode`,
    );

    return {
      paymentId: payment.id,
      pixQrCode: qrCode.encodedImage,
      pixCopyPaste: qrCode.payload,
    };
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail: unknown = await res.json().catch(() => null);
      this.logger.error(`Asaas POST ${path} status=${res.status}`, detail);
      throw new BadRequestException('Erro ao criar cobrança Pix.');
    }

    return res.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { access_token: this.apiKey },
    });

    if (!res.ok) {
      const detail: unknown = await res.json().catch(() => null);
      this.logger.error(`Asaas GET ${path} status=${res.status}`, detail);
      throw new BadRequestException('Erro ao obter QR Code Pix.');
    }

    return res.json() as Promise<T>;
  }

  private tomorrow(): string {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }
}
