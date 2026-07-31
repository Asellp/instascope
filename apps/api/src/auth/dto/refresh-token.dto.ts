import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Yenileme tokenı',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token metin olmalıdır.' })
  @IsNotEmpty({ message: 'Refresh token boş bırakılamaz.' })
  refreshToken!: string;
}
