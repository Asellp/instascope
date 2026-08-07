import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type OverviewRange = '7d' | '30d' | '90d';

export class OverviewQueryDto {
  @ApiPropertyOptional({
    description: 'Analiz aralığı',
    enum: ['7d', '30d', '90d'],
    default: '30d',
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'], {
    message: "range değeri '7d', '30d' veya '90d' olmalıdır.",
  })
  range?: OverviewRange = '30d';
}