import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class ReorderComplementOptionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  optionIds: number[];
}
