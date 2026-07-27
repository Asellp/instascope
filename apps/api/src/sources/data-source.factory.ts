import { Injectable, BadRequestException } from '@nestjs/common';
import { IDataSource } from './data-source.interface';
import { MockDataSourceService } from './mock-data-source.service';
import { RealDataSourceService } from './real-data-source.service';
import { AiDataSourceService } from './ai-data-source.service';

@Injectable( )
export class DataSourceFactory {
  constructor(
    private readonly mockDataSource: MockDataSourceService,
    private readonly realDataSource: RealDataSourceService,
    private readonly aiDataSource: AiDataSourceService,
  ) {}

  getSource(type: string): IDataSource {
    switch (type) {
      case 'mock':
        return this.mockDataSource;
      case 'real':
        return this.realDataSource;
      case 'ai':
        return this.aiDataSource;
      default:
        throw new BadRequestException(`Geçersiz veri kaynağı tipi: ${type}`);
    }
  }
}