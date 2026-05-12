import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FilterDSLDto } from './filter-dsl.dto';

export class CreateAudienceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @ValidateNested()
  @Type(() => FilterDSLDto)
  filtros: FilterDSLDto;
}
