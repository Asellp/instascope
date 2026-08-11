import { Injectable, BadRequestException } from '@nestjs/common';
import { IDataSource } from './data-source.interface';
import { MockDataSourceService } from './mock-data-source.service';
import { RealDataSourceService } from './real-data-source.service';
import { AiDataSourceService } from './ai-data-source.service';
import { ScrapeDataSourceService } from './scrape-data-source.service';

@Injectable( )
export class DataSourceFactory {
  constructor(
    private readonly mockDataSource: MockDataSourceService,
    private readonly realDataSource: RealDataSourceService,
    private readonly aiDataSource: AiDataSourceService,
    private readonly scrapeDataSource: ScrapeDataSourceService,
  ) {}

  getSource(type: string): IDataSource {
    switch (type) {
      case 'mock':
        return this.mockDataSource;
      case 'real':
        return this.realDataSource;
      case 'ai':
        return this.aiDataSource;
      case 'scrape':
      case 'scraping':
        return this.scrapeDataSource;
      default:
        throw new BadRequestException(`Geçersiz veri kaynağı tipi: ${type}`);
    }
  }
}