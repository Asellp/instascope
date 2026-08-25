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
import { AiDataSourceService } from '../sources/ai-data-source.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { TokenEncryptionModule } from 'src/common/encryption/token-encryption.module';
import { PrismaService } from '../prisma/prisma.service';

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
    AiDataSourceService,
  ],
})
export class CollectorModule implements OnModuleInit {
  constructor(
    @InjectQueue('collect') private collectQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      const activeAccounts = await this.prisma.trackedAccount.findMany({
        where: { status: 'active' },
      });

      for (const account of activeAccounts) {
        // 1. Her 6 saatte bir çalışacak standart tarama işi ('0 */6 * * *')
        await this.collectQueue.add(
          'collect-account-job',
          { accountId: account.id, igUsername: account.igUsername },
          {
            repeat: {
              pattern: '0 */6 * * *',
            },
            jobId: `collect-${account.id}`,
          },
        );

        // 2. Pazar günleri 03:00'te çalışacak haftalık derin tarama işi
        await this.collectQueue.add(
          'collect-account-job',
          { accountId: account.id, igUsername: account.igUsername, deep: true },
          {
            repeat: {
              pattern: '0 3 * * 0',
            },
            jobId: `collect-deep-${account.id}`,
          },
        );
      }

      console.log(`[CollectorModule] ${activeAccounts.length} hesap için 6 saatlik periyodik ve derin tarama işleri senkronize edildi!`);
    } catch (error) {
      console.error('[CollectorModule] Periyodik işler senkronize edilirken hata oluştu:', error);
    }
  }
}