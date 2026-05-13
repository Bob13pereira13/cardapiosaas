import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductLabel,
  ProductLink,
  ProductOrderType,
  ProductUnit,
} from '@prisma/client';

export class UpdateProductDto {
  // ── campos PT existentes ──
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) nome?: string;
  @IsOptional() @IsString() @MaxLength(500) descricao?: string;
  @IsOptional()
  @IsNumber({}, { message: 'Preço deve ser um número.' })
  @Min(0)
  preco?: number;
  @IsOptional() @IsNumber() @Min(0) precoPromocional?: number;
  @IsOptional() @IsInt() @Min(0) tempoPreparo?: number;
  @IsOptional() @IsString() @MaxLength(80) sku?: string;
  @IsOptional() @IsBoolean() emDestaque?: boolean;
  @IsOptional() @IsBoolean() estoqueAtivo?: boolean;
  @IsOptional() @IsInt() @Min(0) estoque?: number;
  @IsOptional() @IsString() imagem?: string;
  @IsOptional() @IsBoolean() disponivel?: boolean;
  @IsOptional() @IsInt() @Min(1) categoryId?: number;
  @IsOptional() @IsBoolean() disponibilidadeAtiva?: boolean;
  @IsOptional() @IsString() disponibilidadeInicio?: string | null;
  @IsOptional() @IsString() disponibilidadeFim?: string | null;

  // ── promoção avançada ──
  @IsOptional() @IsBoolean() isPromotional?: boolean;
  @IsOptional() @IsDateString() promoStartsAt?: string;
  @IsOptional() @IsDateString() promoEndsAt?: string;
  @IsOptional() @IsObject() promoSchedule?: Record<string, unknown>;

  // ── custo ──
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @IsOptional() @IsBoolean() useTechSheet?: boolean;

  // ── identificação ──
  @IsOptional() @IsString() @MaxLength(100) codePdv?: string;

  // ── apresentação ──
  @IsOptional() @IsEnum(ProductLabel) labelType?: ProductLabel | null;

  // ── operacional ──
  @IsOptional() @IsEnum(ProductUnit) unitOfMeasure?: ProductUnit;
  @IsOptional() @IsBoolean() useCustomNameKds?: boolean;
  @IsOptional() @IsString() @MaxLength(200) customNameKds?: string;
  @IsOptional() @IsBoolean() hideObservations?: boolean;
  @IsOptional() @IsBoolean() hideQtyButtons?: boolean;
  @IsOptional() @IsBoolean() isNew?: boolean;
  @IsOptional() @IsBoolean() isAdult?: boolean;
  @IsOptional() @IsBoolean() isServiceFeeFree?: boolean;

  // ── disponibilidade (opcionais no update) ──
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ProductOrderType, { each: true })
  orderTypes?: ProductOrderType[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ProductLink, { each: true })
  availableLinks?: ProductLink[];
}
