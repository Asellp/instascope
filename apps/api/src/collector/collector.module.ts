import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CollectorProcessor } from './collector.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { DataSourceFactory } from '../sources/data-source.factory';
import { RealDataSourceService } from '../sources/real-data-source.service';
import { ScrapeDataSourceService } from '../sources/scrape-data-source.service';
import { MockDataSourceService } from '../sources/mock-data-source.service';
import { AiDataSourceService } from '../sources/ai-data-source.service'; // <--- Eksik olan servis eklendi
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { TokenEncryptionModule } from 'src/common/encryption/token-encryption.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    BullModule.registerQueue({
      name: 'collect',
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'collect',
      adapter: BullMQAdapter,
    }),
    TokenEncryptionModule,
  ],
  providers: [
    CollectorProcessor,
    DataSourceFactory,
    RealDataSourceService,
    ScrapeDataSourceService,
    MockDataSourceService,
    AiDataSourceService, // <--- Providers arasına dahil edildi
  ],
})
export class CollectorModule implements OnModuleInit {
  constructor(@InjectQueue('collect') private collectQueue: Queue) {}

  async onModuleInit() {
    await this.collectQueue.add(
      'scheduled-collect',
      {},
      {
        repeat: {
          every: 6 * 60 * 60 * 1000, // 6 saat
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    console.log('Her 6 saatte bir çalışacak "collect" kuyruğu başarıyla tanımlandı!');
  }
}