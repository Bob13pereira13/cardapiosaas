import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ZoneType } from '@prisma/client';

// Todos os campos são opcionais no update.
// Validação condicional de tipo (BAIRRO_LIST/RADIUS) é feita no service
// com base no estado resultante (existing merged with dto).
export class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(ZoneType)
  tipo?: ZoneType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bairros?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  radiusKm?: number;

  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fretefixo?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tempoEstimadoMin?: number;

  @IsOptional()
  @IsInt()
  prioridade?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
