import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductLabel } from '@prisma/client';

export class BatchUpdatePayloadDto {
  @IsOptional() @IsInt() @Min(1) categoryId?: number;
  @IsOptional() @IsBoolean() disponivel?: boolean;
  @IsOptional() @IsBoolean() emDestaque?: boolean;
  @IsOptional() @IsBoolean() estoqueAtivo?: boolean;
  @IsOptional() @IsEnum(ProductLabel) labelType?: ProductLabel | null;
}

export class BatchUpdateProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  productIds: number[];

  @ValidateNested()
  @Type(() => BatchUpdatePayloadDto)
  updates: BatchUpdatePayloadDto;
}
