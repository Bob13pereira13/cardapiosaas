export interface GeocodedAddress {
  cep: string; // 8 digits, no formatting
  logradouro: string;
  bairro: string; // raw, not normalized
  cidade: string;
  estado: string;
  lat?: number;
  lng?: number;
}
