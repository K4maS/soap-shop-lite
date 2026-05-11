import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+7\d{10}$/, { message: 'Укажите телефон в формате +7XXXXXXXXXX' })
  phone: string;
}
