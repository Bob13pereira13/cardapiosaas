import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ZApiWebhookService, WebhookEventType } from './zapi-webhook.service';

type ZApiPayload = {
  type?: string;
  messageId?: string;
  zaapId?: string;
  phone?: string;
  instanceId?: string;
  [key: string]: unknown;
};

@Controller('webhooks')
export class ZApiWebhookController {
  private readonly logger = new Logger(ZApiWebhookController.name);
  private readonly webhookToken = process.env.ZAPI_WEBHOOK_TOKEN ?? '';

  constructor(private readonly webhookService: ZApiWebhookService) {}

  @Post('zapi')
  @HttpCode(HttpStatus.OK)
  async handleZapi(
    @Headers() headers: Record<string, string>,
    @Body() body: ZApiPayload,
  ) {
    // Token validation — only enforced when ZAPI_WEBHOOK_TOKEN is set
    if (this.webhookToken) {
      const incoming = headers['x-zapi-token'] ?? '';
      if (incoming !== this.webhookToken) {
        throw new UnauthorizedException('Invalid webhook token.');
      }
    }

    const eventType = this.parseEventType(body);
    const messageId = body.messageId ?? body.zaapId ?? '';

    if (!eventType || !messageId) {
      this.logger.warn(
        `Unrecognised webhook payload: type="${body.type}" messageId="${messageId}"`,
      );
      return { received: true, matched: false };
    }

    return this.webhookService.processEvent(eventType, messageId);
  }

  private parseEventType(body: ZApiPayload): WebhookEventType | null {
    switch (body.type?.toLowerCase()) {
      case 'deliverycallback':
        return 'DELIVERED';
      case 'readreceipt':
        return 'READ';
      default:
        return null;
    }
  }
}
