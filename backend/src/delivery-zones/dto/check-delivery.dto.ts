import { IsNotEmpty, IsString } from 'class-validator';

export class CheckDeliveryDto {
  @IsString()
  @IsNotEmpty()
  cep: string;
}
