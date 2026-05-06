import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Preço deve ser um número.' })
  @Min(0, { message: 'Preço não pode ser negativo.' })
  preco?: number;

  @IsOptional() @IsNumber() @Min(0) precoPromocional?: number;
  @IsOptional() @IsInt() @Min(0) tempoPreparo?: number;
  @IsOptional() @IsString() @MaxLength(80) sku?: string;
  @IsOptional() @IsBoolean() emDestaque?: boolean;
  @IsOptional() @IsBoolean() estoqueAtivo?: boolean;
  @IsOptional() @IsInt() @Min(0) estoque?: number;

  @IsOptional()
  @IsString()
  imagem?: string;

  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;
}
