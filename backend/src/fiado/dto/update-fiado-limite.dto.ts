import { IsNumber, Min } from 'class-validator';

export class UpdateFiadoLimiteDto {
  @IsNumber()
  @Min(0)
  fiadoLimite: number;
}
