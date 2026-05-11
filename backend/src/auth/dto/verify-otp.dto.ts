import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+7\d{10}$/, { message: 'Укажите телефон в формате +7XXXXXXXXXX' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Код должен быть 6 символов' })
  code: string;
}
