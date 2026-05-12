import { IsNotEmpty, IsString } from 'class-validator';

export class SelectRestaurantDto {
  @IsString()
  @IsNotEmpty()
  restaurantPublicId: string;
}
