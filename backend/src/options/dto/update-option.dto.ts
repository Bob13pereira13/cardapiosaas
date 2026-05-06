import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateOptionDto {
  @IsString() @IsOptional() nome?: string;
  @IsNumber() @IsOptional() priceModifier?: number;
  @IsBoolean() @IsOptional() available?: boolean;
  @IsInt() @IsOptional() displayOrder?: number;
}
