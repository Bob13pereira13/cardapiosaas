import { Injectable } from '@nestjs/common';
import { GeocodedAddress } from './interfaces/geocoded-address.interface';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { ViaCepProvider } from './providers/viacep.provider';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const CACHE_MAX = 10_000;

interface CacheEntry {
  data: GeocodedAddress;
  expiresAt: number;
}

@Injectable()
export class GeocodingService {
  private readonly cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly brasilapi: BrasilApiProvider,
    private readonly viacep: ViaCepProvider,
  ) {}

  /** Returns 8-digit string or null when input can't be normalized to a valid CEP. */
  normalizeCep(input: string): string | null {
    const digits = input.replace(/\D/g, '');
    return /^\d{8}$/.test(digits) ? digits : null;
  }

  /**
   * Resolves a CEP (any format) to a GeocodedAddress.
   * Strategy: BrasilAPI first (provides lat/lng), ViaCEP fallback.
   * Results cached 24 h, max 10 k entries (FIFO eviction).
   */
  async lookupCep(rawCep: string): Promise<GeocodedAddress | null> {
    const cep = this.normalizeCep(rawCep);
    if (!cep) return null;

    const cached = this.cache.get(cep);
    if (cached && cached.expiresAt > Date.now()) {
      this.hits++;
      return cached.data;
    }

    this.misses++;

    // BrasilAPI gives coords + address; ViaCEP is address-only fallback
    let result = await this.brasilapi.fetch(cep);
    if (!result) result = await this.viacep.fetch(cep);

    if (result) {
      if (this.cache.size >= CACHE_MAX) {
        // FIFO eviction: Map preserves insertion order
        this.cache.delete(this.cache.keys().next().value as string);
      }
      this.cache.set(cep, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return result;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: CACHE_MAX,
      hits: this.hits,
      misses: this.misses,
    };
  }
}
