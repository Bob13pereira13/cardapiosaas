import { Injectable, Logger } from '@nestjs/common';
import { GeocodedAddress } from '../interfaces/geocoded-address.interface';

const TIMEOUT_MS = 5000;

@Injectable()
export class ViaCepProvider {
  private readonly logger = new Logger(ViaCepProvider.name);

  async fetch(cep: string): Promise<GeocodedAddress | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await globalThis.fetch(
        `https://viacep.com.br/ws/${cep}/json/`,
        { signal: controller.signal },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      if (data.erro) return null; // ViaCEP returns { "erro": "true" } for unknown CEPs

      return {
        cep,
        logradouro: (data.logradouro as string) ?? '',
        bairro: (data.bairro as string) ?? '',
        cidade: (data.localidade as string) ?? '',
        estado: (data.uf as string) ?? '',
        // ViaCEP does not provide coordinates
      };
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        this.logger.warn(
          `ViaCEP lookup failed for ${cep}: ${(err as Error).message}`,
        );
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
