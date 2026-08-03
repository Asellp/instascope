import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class AccountResponseDto {
  @ApiProperty({ description: 'Hesap IDsi', example: 'b7351c3c-c464...' })
  id!: string;

  @ApiProperty({ description: 'Instagram kullanıcı adı', example: 'atolye.studio' })
  igUsername!: string;

  @ApiPropertyOptional({ description: 'Instagram Hesap IDsi', example: '17841444785369518' })
  igAccountId?: string | null;

  @ApiProperty({ description: 'Kaynak türü', enum: SourceType })
  sourceType!: SourceType;

  // KRİTİK GÜVENLİK: Bu alan veritabanında olsa bile dışarıya asla gitmeyecek!
  @Exclude()
  accessTokenEnc?: string | null;

  @ApiPropertyOptional({ description: 'Zamanlama kuralı', example: '0 0 * * *' })
  scheduleCron?: string | null;

  @ApiProperty({ description: 'Hesap durumu', example: 'active' })
  status!: string;

  constructor(partial: Partial<AccountResponseDto>) {
    Object.assign(this, partial);
  }
}