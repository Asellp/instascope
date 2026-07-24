import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Eklenecek hesabın kullanıcı adı',
    example: 'zeynep_dev',
  })
  @IsString({ message: 'Kullanıcı adı metin (string) olmalıdır.' })
  @IsNotEmpty({ message: 'Kullanıcı adı boş bırakılamaz.' })
  username!: string;

  @ApiProperty({
    description: 'Hesabın bağlı olduğu platform',
    example: 'instagram',
  })
  @IsString({ message: 'Platform adı metin (string) olmalıdır.' })
  @IsNotEmpty({ message: 'Platform bilgisi boş bırakılamaz.' })
  platform!: string;

  @ApiPropertyOptional({
    description: 'Hesap hakkında isteğe bağlı açıklama/not',
    example: 'Kişisel geliştirici hesabı',
  })
  @IsOptional()
  @IsString({ message: 'Açıklama metin (string) olmalıdır.' })
  bio?: string;
}