import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealDataSourceService } from '../sources/real-data-source.service';
import { CacheService } from '../cache/cache.service';
import { SourceType } from '@prisma/client';

@Processor('collect')
@Injectable()
export class CollectorProcessor extends WorkerHost {
  private readonly logger = new Logger(CollectorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realDataSource: RealDataSourceService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  private wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[BullMQ] 'collect' işi başladı! Job ID: ${job.id}`);

    const accountId = job.data?.accountId;

    const accounts = accountId
      ? await this.prisma.trackedAccount.findMany({ where: { id: accountId, status: 'active' } })
      : await this.prisma.trackedAccount.findMany({
          where: { status: 'active', sourceType: SourceType.API },
        });

    if (accounts.length === 0) {
      this.logger.warn('İşlenecek aktif hesap bulunamadı.');
      return { success: true, message: 'No active accounts' };
    }

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

            // Metrik değerlerini hazırlayalım
            const likesCount = item.likesCount || 0;
            const commentsCount = item.commentsCount || 0;
            const reachCount = item.reach || 0;
            const viewsCount = item.views || 0;
            const engagementRate = likesCount + commentsCount;

            await this.prisma.postMetric.upsert({
              where: { postId: savedPost.id },
              update: {
                likes: likesCount,
                commentsCount: commentsCount,
                reach: reachCount,
                views: viewsCount,
                engagementRate: engagementRate,
              },
              create: {
                postId: savedPost.id,
                likes: likesCount,
                commentsCount: commentsCount,
                views: viewsCount,
                reach: reachCount,
                engagementRate: engagementRate,
              },
            });

            const commentsResponse = await this.realDataSource.fetchComments({
              accessToken: account.accessTokenEnc,
              igMediaId: item.id,
            });

            if (commentsResponse && commentsResponse.data) {
              for (const commentItem of commentsResponse.data) {
                const existingComment = await this.prisma.comment.findFirst({
                  where: {
                    postId: savedPost.id,
                    text: commentItem.text,
                    authorHash: commentItem.username || 'anonymous',
                  },
                });

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

        await this.prisma.collectionJob.update({
          where: { id: collectionJobRecord.id },
          data: {
            status: 'COMPLETED',
            finishedAt: new Date(),
            itemsCollected: totalItemsCollected,
          },
        });

        // B3.5 - Hesap verisi güncellendi (yeni post/metric yazıldı),
        // bu hesaba ait tüm overview cache kayıtlarını geçersiz kıl.
        if (totalItemsCollected > 0) {
          await this.cacheService.invalidatePattern(`overview:${account.id}:*`);
          this.logger.log(`Cache invalidated: overview:${account.id}:*`);
        }

        // 1. Hesap Analiz Servisini Tetikle (Topics & Besttime)
        try {
          this.logger.log(`AI hesap analizi tetikleniyor (Account ID: ${account.id})...`);
          await fetch(
            process.env.AI_SERVICE_URL || 'http://localhost:8000/internal/analyze-account',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accountId: account.id,
                igUsername: account.igUsername,
              }),
            },
          );
          this.logger.log(`AI hesap analizi başarıyla tetiklendi: ${account.igUsername}`);
        } catch (aiError: unknown) {
          const aiErrMsg = aiError instanceof Error ? aiError.message : String(aiError);
          this.logger.warn(`AI hesap analizi tetiklenirken hata oluştu: ${aiErrMsg}`);
        }

        // 2. Sentiment Analiz Servisini Tetikle (Toplu Yorum Gönderimi)
        try {
          const commentsToAnalyze = await this.prisma.comment.findMany({
            where: { post: { accountId: account.id } },
            select: { id: true, text: true },
          });

          if (commentsToAnalyze.length > 0) {
            this.logger.log(`${commentsToAnalyze.length} yorum için Sentiment analizi tetikleniyor...`);

            const sentimentUrl = process.env.AI_SERVICE_URL_SENTIMENT || 'http://localhost:8000/internal/analyze';

            await fetch(sentimentUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                kind: 'sentiment',
                comments: commentsToAnalyze.map((c) => ({
                  comment_id: c.id,
                  text: c.text,
                })),
              }),
            });
            this.logger.log('Sentiment analizi başarıyla tamamlandı ve kaydedildi.');
          }
        } catch (sentimentError: unknown) {
          const sentErrMsg = sentimentError instanceof Error ? sentimentError.message : String(sentimentError);
          this.logger.warn(`Sentiment analizi tetiklenirken hata oluştu: ${sentErrMsg}`);
        }

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