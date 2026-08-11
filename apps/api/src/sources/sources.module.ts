import { Module } from '@nestjs/common';
import { MockDataSourceService } from './mock-data-source.service';
import { RealDataSourceService } from './real-data-source.service';
import { AiDataSourceService } from './ai-data-source.service';
import { DataSourceFactory } from './data-source.factory';
import { ScrapeDataSourceService } from './scrape-data-source.service';
@Module({
  providers: [
    MockDataSourceService,
    RealDataSourceService,
    AiDataSourceService,
    DataSourceFactory,
    ScrapeDataSourceService,
  ],
  exports: [DataSourceFactory], // Diğer modüller bu fabrikayı kullanabilsin diye dışarı aktarıyoruz
})
export class SourcesModule {}