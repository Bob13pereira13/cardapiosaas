import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class ReorderProductComplementsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  complementIds: number[];
}
