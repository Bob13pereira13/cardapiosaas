import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MarketplaceProvider } from '@prisma/client';

export class CreateMarketplaceIntegrationDto {
  @IsEnum(MarketplaceProvider)
  marketplace: MarketplaceProvider;

  @IsString()
  @MaxLength(255)
  externalMerchantId: string;

  @IsOptional()
  @IsString()
  authData?: string;

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
