import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FilterDSLDto } from './filter-dsl.dto';

export class UpdateAudienceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilterDSLDto)
  filtros?: FilterDSLDto;
}
