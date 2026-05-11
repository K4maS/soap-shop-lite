import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

const NAME_REGEX = /^[a-zA-Zа-яА-ЯёЁ\s'-]+$/;
const NAME_MSG = 'Только буквы, пробелы и дефис';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Минимум 2 символа' })
  @MaxLength(50, { message: 'Максимум 50 символов' })
  @Matches(NAME_REGEX, { message: NAME_MSG })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Минимум 2 символа' })
  @MaxLength(50, { message: 'Максимум 50 символов' })
  @Matches(NAME_REGEX, { message: NAME_MSG })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Адрес слишком короткий' })
  @MaxLength(300, { message: 'Адрес слишком длинный' })
  @Matches(/\b\d{6}\b/, { message: 'Адрес должен содержать почтовый индекс (6 цифр), например: 101000, г. Москва, ул. Примерная, д. 1' })
  defaultAddress?: string;
}
