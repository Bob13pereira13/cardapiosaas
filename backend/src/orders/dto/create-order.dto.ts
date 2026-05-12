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
import { DeliveryType, OrderOrigin, PaymentMethod } from '@prisma/client';

// WHATSAPP_BOT excluído intencionalmente — requer integração com bot real.
// TODO: Permitir WHATSAPP_BOT quando integração com bot estiver real (ver BLOCOS_INVENTARIO.md B.2)
const ALLOWED_ORDER_ORIGINS = [
  OrderOrigin.WEBSITE,
  OrderOrigin.MANUAL,
  OrderOrigin.IFOOD,
  OrderOrigin.OTHER,
] as const;

export class SelectedOptionDto {
  @IsInt()
  optionGroupId: number;

  @IsInt()
  optionId: number;
}

export class OrderItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions?: SelectedOptionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  itemNotes?: string;
}

export class CustomerAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  zipcode: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'Telefone inválido. Use apenas números (10–15 dígitos).',
  })
  customerPhone: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'CPF/CNPJ invÃ¡lido. Use apenas nÃºmeros.',
  })
  customerDocument?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  customerAddress?: CustomerAddressDto;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tableId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  deliveryCep?: string;

  @IsOptional()
  @IsEnum(ALLOWED_ORDER_ORIGINS, {
    message:
      'origin inválido. WHATSAPP_BOT requer integração com bot — use WEBSITE, MANUAL, IFOOD ou OTHER.',
  })
  origin?: OrderOrigin;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1, { message: 'O pedido deve ter pelo menos 1 item.' })
  items: OrderItemDto[];
}
