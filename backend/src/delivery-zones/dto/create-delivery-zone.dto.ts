import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ZoneType } from '@prisma/client';

export class CreateDeliveryZoneDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(ZoneType)
  tipo: ZoneType;

  // Obrigatório e não-vazio quando tipo=BAIRRO_LIST; ignorado pelo validator em outros tipos
  @ValidateIf((o: CreateDeliveryZoneDto) => o.tipo === ZoneType.BAIRRO_LIST)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bairros?: string[];

  // Obrigatório quando tipo=RADIUS; ignorado pelo validator em BAIRRO_LIST
  @ValidateIf((o: CreateDeliveryZoneDto) => o.tipo === ZoneType.RADIUS)
  @IsNumber()
  @Min(0.001)
  radiusKm?: number;

  // Sempre opcionais (herdam de Restaurant.lat/lng quando ausentes em RADIUS)
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @IsNumber()
  @Min(0)
  fretefixo: number;

  @IsInt()
  @Min(1)
  tempoEstimadoMin: number;

  @IsOptional()
  @IsInt()
  prioridade?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
