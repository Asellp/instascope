import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Şifre sıfırlama tokenı (forgot-password sonrası üretilen)',
    example: 'd41d8cd98f00b204e9800998ecf8427e...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'Yeni kullanıcı şifresi (en az 8 karakter)',
    example: 'YeniSifre123!',
  })
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalı' })
  newPassword!: string;
}