import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ZApiSendResult } from './types';

@Injectable()
export class ZApiClientService implements OnModuleInit {
  private readonly logger = new Logger(ZApiClientService.name);
  private readonly baseUrl = 'https://api.z-api.io';

  private instanceId = '';
  private token = '';
  private mockMode = true;

  onModuleInit() {
    this.instanceId = process.env.ZAPI_INSTANCE_ID ?? '';
    this.token = process.env.ZAPI_TOKEN ?? '';

    if (!this.instanceId || !this.token) {
      this.mockMode = true;
      this.logger.warn(
        'ZAPI_INSTANCE_ID or ZAPI_TOKEN not set — running in mock mode. Messages will not be sent.',
      );
    } else {
      this.mockMode = false;
      const masked =
        this.token.length > 8
          ? this.token.slice(0, 4) + '****' + this.token.slice(-4)
          : '****';
      this.logger.log(
        `Z-API configured. Instance: ${this.instanceId}, Token: ${masked}`,
      );
    }
  }

  get isMockMode(): boolean {
    return this.mockMode;
  }

  async sendText(phone: string, message: string): Promise<ZApiSendResult> {
    const normalized = this.normalizePhone(phone);

    if (this.mockMode) {
      return {
        success: true,
        messageId: `mock-${randomUUID()}`,
        timestamp: new Date(),
        mock: true,
      };
    }

    try {
      const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/send-text`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, message }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error, mock: false };
      }

      const data = (await response.json()) as Record<string, unknown>;
      const messageId = (data.zaapId ?? data.id) as string | undefined;

      return { success: true, messageId, timestamp: new Date(), mock: false };
    } catch (e) {
      return { success: false, error: (e as Error).message, mock: false };
    }
  }

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  }
}
