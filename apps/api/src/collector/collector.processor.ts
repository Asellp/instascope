import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('collect')
export class CollectorProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`[BullMQ] 'collect' işi çalışmaya başladı! Job ID: ${job.id}`);
    
    // Şimdilik simüle ediyoruz:
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    console.log(`[BullMQ] 'collect' işi başarıyla tamamlandı.`);
    return { success: true };
  }
}