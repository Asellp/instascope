import { IsNotEmpty, IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Eklenecek Instagram kullanıcı adı',
    example: 'atolye.studio',
  })
  @IsString({ message: 'Instagram kullanıcı adı metin olmalıdır.' })
  @IsNotEmpty({ message: 'Instagram kullanıcı adı boş bırakılamaz.' })
  @Matches(/^[a-zA-Z0-9._]{1,30}$/, {
    message: 'Geçerli bir Instagram kullanıcı adı giriniz.',
  })
  username!: string;

  @ApiProperty({
    description: 'Kaynak türü',
    example: SourceType.API,
    enum: SourceType,
  })
  @IsEnum(SourceType, { message: 'Geçerli bir kaynak türü seçiniz.' })
  sourceType!: SourceType;

  @ApiPropertyOptional({
    description: 'Toplama sıklığı',
    example: 'daily',
  })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({
    description: 'İsteğe bağlı erişim anahtarı',
  })
  @IsOptional()
  @IsString()
  accessTokenEnc?: string;
}
