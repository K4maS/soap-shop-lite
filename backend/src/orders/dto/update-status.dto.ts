import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(OrderStatus, { message: 'Недопустимый статус заказа' })
  status: OrderStatus;
}
