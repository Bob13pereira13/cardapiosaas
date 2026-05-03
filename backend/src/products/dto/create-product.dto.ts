import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsNumber({}, { message: 'Preço deve ser um número.' })
  @Min(0, { message: 'Preço não pode ser negativo.' })
  preco: number;

  @IsOptional()
  @IsString()
  imagem?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;
}
