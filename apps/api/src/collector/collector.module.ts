import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CollectorProcessor } from './collector.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { RealDataSourceService } from '../sources/real-data-source.service';

@Module({
  imports: [
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
  ],
  providers: [CollectorProcessor, RealDataSourceService],
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