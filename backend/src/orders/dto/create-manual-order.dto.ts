import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { CustomerAddressDto, OrderItemDto } from './create-order.dto';

const MANUAL_PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.PIX,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
] as const;

export class CreateManualOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @Matches(/^\+?\d{8,15}$/, {
    message: 'Telefone inválido.',
  })
  customerPhone: string;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsEnum(MANUAL_PAYMENT_METHODS, {
    message: 'Método de pagamento inválido para pedido manual.',
  })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  customerAddress?: CustomerAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tableId?: number;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1, { message: 'O pedido deve ter pelo menos 1 item.' })
  items: OrderItemDto[];
}
