import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PostsQueryDto {
  @ApiPropertyOptional({ description: 'Sayfalama için cursor (son gönderinin IDsi)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Sayfa başına kayıt sayısı', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sıralama alanı', enum: ['date', 'engagement'], default: 'date' })
  @IsOptional()
  @IsIn(['date', 'engagement'])
  sortBy?: 'date' | 'engagement' = 'date';

  @ApiPropertyOptional({ description: 'Sıralama yönü', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'İçerik tipi filtresi (örn. IMAGE, VIDEO, CAROUSEL)' })
  @IsOptional()
  @IsString()
  contentType?: string;
}