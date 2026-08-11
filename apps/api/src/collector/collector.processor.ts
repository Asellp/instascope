import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SourceType } from '@prisma/client';
import { DataSourceFactory } from '../sources/data-source.factory';
import { ApiDataMapper } from '../common/mappers/api-data.mapper';
import { ScrapeDataMapper } from '../common/mappers/scrape-data.mapper';
import { MockDataMapper } from '../common/mappers/mock-data.mapper';
import { NormalizedPost } from '../common/mappers/normalized-post.interface';

@Processor('collect')
@Injectable()
export class CollectorProcessor extends WorkerHost {
  private readonly logger = new Logger(CollectorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataSourceFactory: DataSourceFactory,
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
          where: { status: 'active' },
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
        // Kaynak tipini belirle (Prisma SourceType enum değerini lowercase string'e çeviriyoruz: API -> real, vb.)
        // Projedeki sourceType yapına göre burayı 'api' | 'scrape' | 'mock' olarak esnek tutabilirsin.
        const rawSourceType = account.sourceType ? account.sourceType.toLowerCase() : 'real';
        const sourceTypeKey = rawSourceType === 'api' ? 'real' : rawSourceType; 
        
        const dataSource = this.dataSourceFactory.getSource(sourceTypeKey);

        this.logger.log(`Hesap işleniyor: ${account.igUsername} (ID: ${account.id}) - Kaynak: ${sourceTypeKey}`);

        // Veriyi seçilen kaynaktan çek
        const rawPostsResponse = await dataSource.fetchPosts({
          accessToken: account.accessTokenEnc,
          igAccountId: account.igAccountId,
          platform: account.igUsername,
        });

        let totalItemsCollected = 0;
        const postsList = rawPostsResponse?.data || [];
        totalItemsCollected = postsList.length;

        for (const item of postsList) {
          // Doğru mapper'ı kullanarak veriyi ortak formata (NormalizedPost) dönüştür
          let normalizedPost: NormalizedPost;
          
          if (sourceTypeKey === 'real') {
            normalizedPost = ApiDataMapper.mapToNormalized(item);
          } else if (sourceTypeKey === 'scrape' || sourceTypeKey === 'scraping') {
            normalizedPost = ScrapeDataMapper.mapToNormalized(item);
          } else {
            normalizedPost = MockDataMapper.mapToNormalized(item);
          }

          if (!normalizedPost.igMediaId) continue;

          // Medya tipini normalize et
          let mediaType = 'IMAGE';
          const rawType = normalizedPost.type?.toUpperCase();
          if (rawType === 'CAROUSEL_ALBUM' || rawType === 'CAROUSEL') {
            mediaType = 'CAROUSEL';
          } else if (rawType === 'VIDEO') {
            mediaType = 'VIDEO';
          }

          const savedPost = await this.prisma.post.upsert({
            where: { igMediaId: normalizedPost.igMediaId },
            update: { 
              caption: normalizedPost.caption,
              type: mediaType,
            },
            create: {
              accountId: account.id,
              igMediaId: normalizedPost.igMediaId,
              type: mediaType,
              caption: normalizedPost.caption,
              postedAt: normalizedPost.postedAt || new Date(),
              permalink: normalizedPost.permalink || `https://instagram.com/p/${normalizedPost.igMediaId}`,
            },
          });

          // Metrikleri kaydet
          const likesCount = normalizedPost.metrics?.likes || 0;
          const commentsCount = normalizedPost.metrics?.commentsCount || 0;
          const reachCount = normalizedPost.metrics?.reach || 0;
          const viewsCount = normalizedPost.metrics?.views || 0;
          const engagementRate = normalizedPost.metrics?.engagementRate || (likesCount + commentsCount);

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

          // Yorumları işle (Eğer servisten yorumlar geldiyse)
          let commentsData = normalizedPost.comments;
          if (!commentsData && sourceTypeKey === 'real') {
            const commentsResponse = await dataSource.fetchComments({
              accessToken: account.accessTokenEnc,
              igMediaId: normalizedPost.igMediaId,
            });
            if (commentsResponse?.data) {
              commentsData = commentsResponse.data.map((c: any) => ({
                authorHash: c.username || c.from?.username || 'anonymous',
                text: c.text,
                commentedAt: c.timestamp ? new Date(c.timestamp) : new Date(),
              }));
            }
          }

          if (commentsData && Array.isArray(commentsData)) {
            for (const commentItem of commentsData) {
              const existingComment = await this.prisma.comment.findFirst({
                where: {
                  postId: savedPost.id,
                  text: commentItem.text,
                  authorHash: commentItem.authorHash || 'anonymous',
                },
              });

              if (!existingComment) {
                await this.prisma.comment.create({
                  data: {
                    postId: savedPost.id,
                    authorHash: commentItem.authorHash || 'anonymous',
                    text: commentItem.text,
                    commentedAt: commentItem.commentedAt || new Date(),
                  },
                });
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

        if (totalItemsCollected > 0) {
          await this.cacheService.invalidatePattern(`overview:${account.id}:*`);
          this.logger.log(`Cache invalidated: overview:${account.id}:*`);
        }

        // 1. Hesap Analiz Servisini Tetikle
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
        } catch (aiError: unknown) {
          const aiErrMsg = aiError instanceof Error ? aiError.message : String(aiError);
          this.logger.warn(`AI hesap analizi tetiklenirken hata oluştu: ${aiErrMsg}`);
        }

        // 2. Sentiment Analiz Servisini Tetikle
        try {
          const commentsToAnalyze = await this.prisma.comment.findMany({
            where: { post: { accountId: account.id } },
            select: { id: true, text: true },
          });

          if (commentsToAnalyze.length > 0) {
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