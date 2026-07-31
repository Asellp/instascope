import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('collect') private readonly collectQueue: Queue, // BullMQ kuyruğunu buraya enjekte ediyoruz
  ) {}

  async create(data: { igUsername: string; sourceType: string; accessTokenEnc?: string; scheduleCron?: string }) {
    // 1. Hesabı veritabanına kaydedelim
    const account = await this.prisma.trackedAccount.create({ data });

    // 2. Yeni eklenen hesap için BullMQ kuyruğuna tekrarlayan (repeatable) veya hemen çalışacak bir iş ekleyelim
    await this.collectQueue.add(
      'collect-account-job',
      { accountId: account.id, igUsername: account.igUsername },
      {
        // Eğer hesapta cron tanımlıysa onu kullanalım, yoksa her 5 dakikada bir (*/5 * * * *) tekrarlasın
        repeat: {
          pattern: account.scheduleCron || '*/5 * * * *',
        },
        // İşin ID'sini hesap ID'sine bağlayarak aynı işin tekrar yığılmasını önleyebiliriz
        jobId: `collect-${account.id}`,
      },
    );

    return account;
  }

  async findAll() {
    return this.prisma.trackedAccount.findMany();
  }

  async remove(id: string) {
    // Hesabı silerken kuyruktaki tekrarlayan işi de temizlemek iyi bir pratik olabilir
    try {
      const repeatableJobs = await this.collectQueue.getRepeatableJobs();
      const jobToRemove = repeatableJobs.find(job => job.id === `collect-${id}`);
      if (jobToRemove) {
        await this.collectQueue.removeRepeatableByKey(jobToRemove.key);
      }
    } catch (e) {
      // Hata olursa akışı bozmasın
    }

    return this.prisma.trackedAccount.delete({ where: { id } });
  }
}