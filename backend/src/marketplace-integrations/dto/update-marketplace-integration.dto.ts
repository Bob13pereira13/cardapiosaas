import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMarketplaceIntegrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalMerchantId?: string;

  @IsOptional()
  @IsString()
  authData?: string;

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
