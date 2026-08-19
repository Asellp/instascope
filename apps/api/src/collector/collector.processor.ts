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
import { TokenEncryptionService } from '../common/encryption/token-encryption.service';

@Processor('collect')
@Injectable()
export class CollectorProcessor extends WorkerHost {
  private readonly logger = new Logger(CollectorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataSourceFactory: DataSourceFactory,
    private readonly cacheService: CacheService,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {
    super();
  }

  private wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[BullMQ] 'collect' işi başladı! Job ID: ${job.id}`);

    const accountId = job.data?.accountId;
    const isDeepScan = job.data?.deep === true;

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
      let decryptedAccessToken = account.accessTokenEnc;
      if (account.accessTokenEnc) {
        try {
          decryptedAccessToken = this.tokenEncryption.decrypt(account.accessTokenEnc);
        } catch (e) {
          this.logger.error(`Token çözülemedi (Account ID: ${account.id})`);
        }
      }

      const collectionJobRecord = await this.prisma.collectionJob.create({
        data: {
          accountId: account.id,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      try {
        const rawSourceType = account.sourceType ? account.sourceType.toLowerCase() : 'real';
        const sourceTypeKey = rawSourceType === 'api' ? 'real' : rawSourceType;

        if (sourceTypeKey === 'real' && !account.igAccountId) {
          throw new Error('Eksik Parametre: igAccountId tanımlı değil (API kaynağı için zorunlu).');
        }

        const dataSource = this.dataSourceFactory.getSource(sourceTypeKey);

        this.logger.log(`Hesap işleniyor: ${account.igUsername} (ID: ${account.id}) - Kaynak: ${sourceTypeKey} (Derin Tarama: ${isDeepScan})`);

        let scrapeParams: any = {
          accessToken: decryptedAccessToken,
          igAccountId: account.igAccountId,
          platform: account.igUsername,
        };

        if (sourceTypeKey === 'scrape' || sourceTypeKey === 'scraping') {
          if (isDeepScan) {
            scrapeParams = { ...scrapeParams, maxPosts: 200, maxComments: 10 };
          } else {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - 7);
            scrapeParams = { ...scrapeParams, since: sinceDate.toISOString(), maxPosts: 30 };
          }
        }

        // 1. ÖNCE PROFİL ÇEKİLİYOR (Engagement rate hesabı için takipçi sayısı önceden lazım)
        let followersCount = 0;
        let followingCount = 0;
        try {
          const dsAny = dataSource as any;
          const profileFunc = dsAny.fetchAccountProfile || dsAny.fetchProfile;
          if (typeof profileFunc === 'function') {
            const profileResult = await profileFunc.call(dataSource, {
              accessToken: decryptedAccessToken,
              igAccountId: account.igAccountId,
              platform: account.igUsername,
            });
            const profileData = profileResult?.data || profileResult;
            followersCount = profileData?.followersCount ?? profileData?.followers_count ?? 0;
            followingCount = profileData?.followingCount ?? profileData?.follows_count ?? profileData?.following_count ?? 0;
          }
        } catch (profileErr: unknown) {
          const msg = profileErr instanceof Error ? profileErr.message : String(profileErr);
          this.logger.warn(`Profil çekilirken hata oluştu, followersCount=0 kullanılacak: ${msg}`);
        }

        // 2. SONRA POSTLAR ÇEKİLİYOR
        const rawPostsResponse = await dataSource.fetchPosts(scrapeParams);

        let totalItemsCollected = 0;
        const postsList = rawPostsResponse?.data || [];
        totalItemsCollected = postsList.length;

        for (const item of postsList) {
          let normalizedPost: NormalizedPost;
          
          if (sourceTypeKey === 'real') {
            normalizedPost = ApiDataMapper.mapToNormalized(item);
          } else if (sourceTypeKey === 'scrape' || sourceTypeKey === 'scraping') {
            // TAKİPÇİ SAYISI MAPPER'A AKTARILIYOR
            normalizedPost = ScrapeDataMapper.mapToNormalized(item, followersCount);
          } else {
            normalizedPost = MockDataMapper.mapToNormalized(item);
          }

          if (!normalizedPost.igMediaId) continue;

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
              imageUrl: normalizedPost.imageUrl,
            },
            create: {
              accountId: account.id,
              igMediaId: normalizedPost.igMediaId,
              type: mediaType,
              caption: normalizedPost.caption,
              imageUrl: normalizedPost.imageUrl,
              postedAt: normalizedPost.postedAt || new Date(),
              permalink: normalizedPost.permalink || `https://instagram.com/p/${normalizedPost.igMediaId}`,
            },
          });

          const likesCount = normalizedPost.metrics?.likes || 0;
          const commentsCount = normalizedPost.metrics?.commentsCount || 0;
          const reachCount = normalizedPost.metrics?.reach || 0;
          const viewsCount = normalizedPost.metrics?.views || 0;
          const engagementRate = normalizedPost.metrics?.engagementRate ?? 0;

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

          let commentsData = normalizedPost.comments;

          if (!commentsData || (Array.isArray(commentsData) && commentsData.length === 0)) {
            try {
              const commentsResponse = await dataSource.fetchComments({
                accessToken: decryptedAccessToken,
                igMediaId: normalizedPost.igMediaId,
              });

              const rawFetchedComments = Array.isArray(commentsResponse) 
                ? commentsResponse 
                : (commentsResponse?.data || commentsResponse?.comments || []);

              if (Array.isArray(rawFetchedComments) && rawFetchedComments.length > 0) {
                commentsData = rawFetchedComments.map((c: any) => ({
                  authorHash: c.username || c.from?.username || c.authorHash || 'anonymous',
                  text: c.text || c.message || '',
                  commentedAt: c.timestamp || c.commentedAt ? new Date(c.timestamp || c.commentedAt) : new Date(),
                }));
              }
            } catch (err) {
              // Hata yutulur
            }
          }

          if (commentsData && Array.isArray(commentsData) && commentsData.length > 0) {
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

        // 3. EN BAŞTA ÇEKİLEN PROFİL BİLGİLERİYLE METRİK KAYDI YAPILIYOR (Mükerrer istek kaldırıldı)
        try {
          await this.prisma.accountMetric.create({
            data: {
              accountId: account.id,
              followers: Number(followersCount),
              following: Number(followingCount),
              mediaCount: totalItemsCollected,
              capturedAt: new Date(),
            },
          });

          this.logger.log(`AccountMetric başarıyla kaydedildi -> Followers: ${followersCount}, Following: ${followingCount}, Media: ${totalItemsCollected}`);
        } catch (metricErr: unknown) {
          const metricErrMsg = metricErr instanceof Error ? metricErr.message : String(metricErr);
          this.logger.warn(`AccountMetric kaydedilirken hata oluştu: ${metricErrMsg}`);
        }

        try {
          this.logger.log(`AI hesap analizi tetikleniyor (Account ID: ${account.id})...`);
          await fetch(
            process.env.AI_SERVICE_URL || 'http://localhost:8000/internal/analyze-account',
            {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-internal-token': process.env.INTERNAL_SECRET_TOKEN || 'instascope-secure-internal-secret-key',
              },
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

        await this.wait(1500);

        try {
          const commentsToAnalyze = await this.prisma.comment.findMany({
            where: { post: { accountId: account.id } },
            select: { id: true, text: true, postId: true },
          });

          if (commentsToAnalyze.length > 0) {
            const sentimentUrl = process.env.AI_SERVICE_URL_SENTIMENT || 'http://localhost:8000/internal/analyze';

            const internalToken = process.env.INTERNAL_SECRET_TOKEN;
            if (!internalToken) {
              throw new Error('INTERNAL_SECRET_TOKEN environment variable is not defined!');
            }
            await fetch(sentimentUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-internal-token': internalToken,
              },
              body: JSON.stringify({
                kind: 'sentiment',
                comments: commentsToAnalyze.map((c) => ({
                  comment_id: c.id,
                  text: c.text,
                  post_id: c.postId,
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