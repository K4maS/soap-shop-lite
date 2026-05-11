import { IsString, IsArray, IsNumber, Min, MinLength, MaxLength, Matches, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @MinLength(10, { message: 'Адрес слишком короткий' })
  @MaxLength(300, { message: 'Адрес слишком длинный' })
  @Matches(/\b\d{6}\b/, { message: 'Адрес должен содержать почтовый индекс (6 цифр), например: 101000, г. Москва, ул. Примерная, д. 1' })
  address: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
