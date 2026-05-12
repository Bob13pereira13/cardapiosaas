import { Injectable, Logger } from '@nestjs/common';
import { GeocodedAddress } from '../interfaces/geocoded-address.interface';

const TIMEOUT_MS = 5000;

@Injectable()
export class BrasilApiProvider {
  private readonly logger = new Logger(BrasilApiProvider.name);

  async fetch(cep: string): Promise<GeocodedAddress | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await globalThis.fetch(
        `https://brasilapi.com.br/api/cep/v2/${cep}`,
        { signal: controller.signal },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;

      const coords = (data.location as Record<string, unknown> | undefined)
        ?.coordinates as Record<string, string> | undefined;
      const lat = coords?.latitude ? parseFloat(coords.latitude) : undefined;
      const lng = coords?.longitude ? parseFloat(coords.longitude) : undefined;

      return {
        cep,
        logradouro: (data.street as string) ?? '',
        bairro: (data.neighborhood as string) ?? '',
        cidade: (data.city as string) ?? '',
        estado: (data.state as string) ?? '',
        lat: lat != null && !isNaN(lat) ? lat : undefined,
        lng: lng != null && !isNaN(lng) ? lng : undefined,
      };
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        this.logger.warn(
          `BrasilAPI lookup failed for ${cep}: ${(err as Error).message}`,
        );
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
