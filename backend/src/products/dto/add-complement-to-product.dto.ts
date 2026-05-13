import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddComplementToProductDto {
  @IsInt()
  @Min(1)
  complementId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
