import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOptionDto {
  @IsString() nome: string;
  @IsNumber() @IsOptional() priceModifier?: number;
  @IsBoolean() @IsOptional() available?: boolean;
  @IsInt() @IsOptional() displayOrder?: number;
}
