import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nome?: string;

  @IsOptional() @IsBoolean() ativa?: boolean;
  @IsOptional() @IsString() @MaxLength(50) icone?: string;
}
