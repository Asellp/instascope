import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'Kullanıcının adı (isteğe bağlı)',
    example: 'Nazgül Aksoy',
  })
  @IsOptional()
  @IsString({ message: 'İsim metin olmalıdır.' })
  name?: string;

  @ApiProperty({
    description: 'Kullanıcının e-posta adresi',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta alanı boş bırakılamaz.' })
  email!: string;

  @ApiProperty({
    description: 'Kullanıcının şifresi',
    example: 'S3cur3P@ssw0rd',
  })
  @IsString({ message: 'Şifre metin olmalıdır.' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  password!: string;
}