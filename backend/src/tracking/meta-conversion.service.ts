import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type MetaEventUser = {
  email?: string;
  phone?: string;
  document?: string;
  city?: string;
};

type MetaEventItem = {
  item_id?: number | string;
  id?: number | string;
  quantity?: number;
  price?: number;
  item_price?: number;
};

type MetaEventPayload = {
  slug?: string;
  event_name?: string;
  event_source_url?: string;
  user?: MetaEventUser;
  items?: MetaEventItem[];
  value?: number;
  currency?: string;
};

@Injectable()
export class MetaConversionService {
  constructor(private prisma: PrismaService) {}

  async sendEvent(payload: MetaEventPayload) {
    const eventName = payload.event_name?.trim();
    const slug = payload.slug?.trim();

    if (!eventName || !slug) {
      return { sent: false, reason: 'missing_required_fields' };
    }

    const restaurant = await this.prisma.user.findFirst({
      where: { slug },
      select: { metaPixelId: true, metaAccessToken: true },
    });

    if (!restaurant?.metaPixelId || !restaurant.metaAccessToken) {
      return { sent: false, reason: 'meta_not_configured' };
    }

    const endpoint = `https://graph.facebook.com/v18.0/${restaurant.metaPixelId}/events`;
    const items = Array.isArray(payload.items) ? payload.items : [];

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${restaurant.metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: payload.event_source_url,
              user_data: this.buildUserData(payload.user),
              custom_data: {
                currency: payload.currency || 'BRL',
                value: Number(payload.value || 0),
                content_type: 'product',
                contents: items.map((item) => ({
                  id: String(item.item_id ?? item.id ?? ''),
                  quantity: Number(item.quantity || 1),
                  item_price: Number(item.price ?? item.item_price ?? 0),
                })),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        return { sent: false, reason: 'meta_rejected_event' };
      }

      return { sent: true };
    } catch {
      return { sent: false, reason: 'meta_request_failed' };
    }
  }

  private buildUserData(user?: MetaEventUser) {
    const userData: Record<string, string[]> = {};
    const email = this.hash(user?.email);
    const phone = this.hashDigits(user?.phone);
    const document = this.hashDigits(user?.document);
    const city = this.hash(user?.city);

    if (email) userData.em = [email];
    if (phone) userData.ph = [phone];
    if (document) userData.external_id = [document];
    if (city) userData.ct = [city];

    return userData;
  }

  private hash(value?: string) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return undefined;
    return createHash('sha256').update(normalized).digest('hex');
  }

  private hashDigits(value?: string) {
    const normalized = value?.replace(/\D/g, '');
    if (!normalized) return undefined;
    return createHash('sha256').update(normalized).digest('hex');
  }
}
