import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

export class CreateProductDto {
  // ── campos PT existentes ──
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsNumber({}, { message: 'Preço deve ser um número.' })
  @Min(0, { message: 'Preço não pode ser negativo.' })
  preco: number;

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
  @IsOptional() @IsString() disponibilidadeInicio?: string;
  @IsOptional() @IsString() disponibilidadeFim?: string;

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
  @IsOptional() @IsEnum(ProductLabel) labelType?: ProductLabel;

  // ── operacional ──
  @IsOptional() @IsEnum(ProductUnit) unitOfMeasure?: ProductUnit;
  @IsOptional() @IsBoolean() useCustomNameKds?: boolean;
  @IsOptional() @IsString() @MaxLength(200) customNameKds?: string;
  @IsOptional() @IsBoolean() hideObservations?: boolean;
  @IsOptional() @IsBoolean() hideQtyButtons?: boolean;
  @IsOptional() @IsBoolean() isNew?: boolean;
  @IsOptional() @IsBoolean() isAdult?: boolean;
  @IsOptional() @IsBoolean() isServiceFeeFree?: boolean;

  // ── disponibilidade (REQUIRED) ──
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ProductOrderType, { each: true })
  orderTypes: ProductOrderType[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ProductLink, { each: true })
  availableLinks: ProductLink[];

  // ── relacionamentos opcionais na criação ──
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  printAreaIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  complementIds?: number[];
}
