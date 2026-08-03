import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('collect') private readonly collectQueue: Queue,
  ) {}

  async create(dto: CreateAccountDto) {
    const account = await this.prisma.trackedAccount.create({
      data: {
        igUsername: dto.username,
        sourceType: dto.sourceType,
        scheduleCron: dto.frequency === 'daily' ? '0 0 * * *' : '*/5 * * * *',
        status: 'collecting',
      },
    });

    await this.collectQueue.add(
      'collect-account-job',
      { accountId: account.id, igUsername: account.igUsername },
      {
        repeat: {
          pattern: account.scheduleCron || '*/5 * * * *',
        },
        jobId: `collect-${account.id}`,
      },
    );

    return account;
  }

  async findAll() {
    return this.prisma.trackedAccount.findMany();
  }

  async findOne(id: string) {
    const account = await this.prisma.trackedAccount.findUnique({
      where: { id },
    });
    if (!account) {
      throw new NotFoundException('Hesap bulunamadı');
    }
    return account;
  }

  async getAccountMetrics(accountId: string) {
    await this.findOne(accountId);

    return this.prisma.accountMetric.findMany({
      where: { accountId },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async getAccountPosts(accountId: string) {
    await this.findOne(accountId);

    return this.prisma.post.findMany({
      where: { accountId },
      include: {
        postMetrics: true,
      },
      orderBy: { postedAt: 'desc' },
    });
  }

  async remove(id: string) {
    // DEĞİŞTİ: Önce hesabın gerçekten var olup olmadığını kontrol ediyoruz.
    // Önceden bu kontrol yoktu, doğrudan prisma.delete çağrılıyordu - var
    // olmayan bir id ile silme denendiğinde Prisma P2025 hatası fırlatıyor,
    // bu da yakalanmadığı için 500 (Internal Server Error) olarak dönüyordu.
    // Şimdi bulunamadığında düzgün bir 404 (NotFoundException) dönüyor.
    await this.findOne(id);

    try {
      const repeatableJobs = await this.collectQueue.getRepeatableJobs();
      const jobToRemove = repeatableJobs.find(
        (job) => job.id === `collect-${id}`,
      );
      if (jobToRemove) {
        await this.collectQueue.removeRepeatableByKey(jobToRemove.key);
      }
    } catch (e) {
      // DEĞİŞTİ: Artık sessizce yutulmuyor, en azından loglanıyor -
      // ileride "hayalet job" birikimi olursa fark edilebilsin diye.
      console.warn(`Repeatable job silinemedi (accountId: ${id}):`, e);
    }

    try {
      return await this.prisma.trackedAccount.delete({ where: { id } });
    } catch (e) {
      // Ekstra güvenlik: findOne() ile delete() arasında (race condition)
      // hesap başka bir istek tarafından silinmiş olabilir.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Hesap bulunamadı');
      }
      throw e;
    }
  }
}