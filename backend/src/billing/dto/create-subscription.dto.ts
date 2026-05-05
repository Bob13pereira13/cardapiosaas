import {
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreditCardDto {
  @IsString()
  @MaxLength(120)
  holderName: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsString()
  @MaxLength(2)
  expiryMonth: string;

  @IsString()
  @MaxLength(4)
  expiryYear: string;

  @IsString()
  @MaxLength(4)
  ccv: string;
}

class CreditCardHolderInfoDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(120)
  email: string;

  @IsString()
  @MaxLength(20)
  cpfCnpj: string;

  @IsString()
  @MaxLength(12)
  postalCode: string;

  @IsString()
  @MaxLength(20)
  addressNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  addressComplement?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobilePhone?: string | null;
}

export class CreateSubscriptionDto {
  @IsString()
  @MaxLength(20)
  cpfCnpj: string;

  @IsNumber()
  @Min(1)
  value: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  plan?: string;

  @IsOptional()
  @IsIn(['PIX', 'CREDIT_CARD'])
  billingType?: 'PIX' | 'CREDIT_CARD';

  @ValidateIf((dto: CreateSubscriptionDto) => dto.billingType === 'CREDIT_CARD')
  @IsObject()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;

  @ValidateIf((dto: CreateSubscriptionDto) => dto.billingType === 'CREDIT_CARD')
  @IsObject()
  @ValidateNested()
  @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo?: CreditCardHolderInfoDto;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;
}
