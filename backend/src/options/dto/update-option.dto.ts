import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateOptionDto {
  @IsString() @IsOptional() nome?: string;
  @IsString() @IsOptional() descricao?: string;
  @IsNumber() @IsOptional() priceModifier?: number;
  @IsString() @IsOptional() imagem?: string;
  @IsBoolean() @IsOptional() available?: boolean;
  @IsInt() @IsOptional() estoque?: number;
  @IsInt() @IsOptional() displayOrder?: number;
}
