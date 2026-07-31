import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealDataSourceService } from '../sources/real-data-source.service';

@Processor('collect')
@Injectable()
export class CollectorProcessor extends WorkerHost {
  private readonly logger = new Logger(CollectorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realDataSource: RealDataSourceService,
  ) {
    super();
  }

  private wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[BullMQ] 'collect' işi başladı! Job ID: ${job.id}`);
    
    const accountId = job.data?.accountId;

    // Hangi hesapların işleneceğini belirleyelim
    const accounts = accountId
      ? await this.prisma.trackedAccount.findMany({ where: { id: accountId, status: 'active' } })
      : await this.prisma.trackedAccount.findMany({ where: { status: 'active', sourceType: 'api' } });

    if (accounts.length === 0) {
      this.logger.warn('İşlenecek aktif hesap bulunamadı.');
      return { success: true, message: 'No active accounts' };
    }

    // Her bir aktif hesap için ayrı bir collection_jobs kaydı açıp süreci yürütelim
    for (const account of accounts) {
      const collectionJobRecord = await this.prisma.collectionJob.create({
        data: {
          accountId: account.id,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      try {
        if (!account.igAccountId) {
          this.logger.warn(`Hesap için igAccountId tanımlı değil: ${account.igUsername}`);
          await this.prisma.collectionJob.update({
            where: { id: collectionJobRecord.id },
            data: { status: 'FAILED', finishedAt: new Date(), error: 'igAccountId is missing' },
          });
          continue;
        }

        this.logger.log(`Hesap işleniyor: ${account.igUsername} (ID: ${account.id})`);

        const realPostsResponse = await this.realDataSource.fetchPosts({
          accessToken: account.accessTokenEnc, 
          igAccountId: account.igAccountId,     
          platform: account.igUsername,
        });

        let totalItemsCollected = 0;
        if (realPostsResponse && realPostsResponse.data) {
          totalItemsCollected = realPostsResponse.data.length;

          for (const item of realPostsResponse.data) {
            const savedPost = await this.prisma.post.upsert({
              where: { igMediaId: item.id },
              update: { caption: item.caption },
              create: {
                accountId: account.id,
                igMediaId: item.id,
                type: 'IMAGE',
                caption: item.caption,
                postedAt: new Date(item.timestamp || Date.now()),
                permalink: item.permalink || `https://instagram.com/p/${item.id}`,
              },
            });

            await this.prisma.postMetric.upsert({
              where: { postId: savedPost.id },
              update: {
                likes: item.likesCount || 0,
                commentsCount: item.commentsCount || 0,
              },
              create: {
                postId: savedPost.id,
                likes: item.likesCount || 0,
                commentsCount: item.commentsCount || 0,
                views: 0,
                reach: 0,
                engagementRate: 0,
              },
            });

            // BURASI EKSİKTİ: Her post için ayrı ayrı yorumları çekelim
            const commentsResponse = await this.realDataSource.fetchComments({
              accessToken: account.accessTokenEnc,
              igMediaId: item.id,
            });

            if (commentsResponse && commentsResponse.data) {
  for (const commentItem of commentsResponse.data) {
    // Önce aynı metne ve posta sahip yorum var mı diye bakalım
    const existingComment = await this.prisma.comment.findFirst({
      where: {
        postId: savedPost.id,
        text: commentItem.text,
        authorHash: commentItem.username || 'anonymous',
      },
    });

    // Eğer yoksa yeni olrak kaydedelim
    if (!existingComment) {
      await this.prisma.comment.create({
        data: {
          postId: savedPost.id,
          authorHash: commentItem.username || 'anonymous',
          text: commentItem.text,
          commentedAt: new Date(commentItem.timestamp || Date.now()),
        },
      });
    }
  }
}
          }
        }

        // Başarılı bittiğinde kaydı COMPLETED yapalım
        await this.prisma.collectionJob.update({
          where: { id: collectionJobRecord.id },
          data: {
            status: 'COMPLETED',
            finishedAt: new Date(),
            itemsCollected: totalItemsCollected,
          },
        });

        await this.wait(1000);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.logger.error(`Veri toplama sırasında hata oluştu: ${errorMessage}`, errorStack);

        await this.prisma.collectionJob.update({
          where: { id: collectionJobRecord.id },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
            error: errorMessage,
          },
        });
      }
    }

    this.logger.log(`[BullMQ] 'collect' işi başarıyla tamamlandı.`);
    return { success: true };
  }
}