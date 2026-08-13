import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { OverviewRange } from './dto/overview-query.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { AccountOverviewResponse } from './interfaces/account-overview.interface';
import { CacheService } from '../cache/cache.service';
import { TokenEncryptionService } from '../common/encryption/token-encryption.service';
import {
  PostSentimentBreakdown,
  SentimentLabel,
} from './interfaces/post-sentiment.interface';
import { HashtagAnalysis } from './interfaces/hashtag-analysis.interface';

const RANGE_TO_DAYS: Record<OverviewRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const RANGE_TO_TTL_SECONDS: Record<OverviewRange, number> = {
  '7d': 60,     // 1 dakika
  '30d': 300,   // 5 dakika
  '90d': 900,   // 15 dakika
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('collect') private readonly collectQueue: Queue,
    private readonly cacheService: CacheService,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  async create(dto: CreateAccountDto, userId: string) {
    // Eğer igAccountId boş string veya null/undefined geldiyse null kabul et
    let fetchedIgAccountId: string | null = 
      dto.igAccountId && dto.igAccountId.trim() !== '' ? dto.igAccountId : null;

    // Eğer igAccountId elde edilemediyse ve token varsa Meta'dan otomatik çekmeyi dene
    if (!fetchedIgAccountId && dto.sourceType === 'API' && dto.accessTokenEnc) {
      try {
        // Önce kullanıcının sayfalarını ve bağlı Instagram hesaplarını çekiyoruz
        const url = `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{id},name&access_token=${dto.accessTokenEnc}`;
        const response = await fetch(url);
        const data = await response.json();

        console.log('--- META SAYFALAR YANITI ---', JSON.stringify(data));

        if (data.data && Array.isArray(data.data)) {
          for (const page of data.data) {
            if (page.instagram_business_account?.id) {
              fetchedIgAccountId = page.instagram_business_account.id;
              break;
            }
          }
        }
      } catch (error: any) {
        console.error('--- META API HATA DETAYI ---', error);
      }
    }

    const account = await this.prisma.trackedAccount.create({
      data: {
        userId,
        igUsername: dto.username,
        sourceType: dto.sourceType,
        igAccountId: fetchedIgAccountId,
        scheduleCron: dto.frequency === 'daily' ? '0 0 * * *' : '*/5 * * * *',
        status: 'active',
        accessTokenEnc: dto.accessTokenEnc
          ? this.tokenEncryption.encrypt(dto.accessTokenEnc)
          : null,
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
  // Admin tüm hesapları, normal kullanıcı sadece kendi hesaplarını görür
  async findAll(userId: string, userRole: Role) {
    if (userRole === Role.ADMIN) {
      return this.prisma.trackedAccount.findMany();
    }
    return this.prisma.trackedAccount.findMany({
      where: { userId },
    });
  }

  // IDOR Korumalı findOne: Kullanıcı admin değilse ve hesap kendisine ait değilse hata fırlatır
  async findOne(id: string, userId?: string, userRole?: Role) {
    const account = await this.prisma.trackedAccount.findUnique({
      where: { id },
    });
    
    if (!account) {
      throw new NotFoundException('Hesap bulunamadı');
    }

    if (userRole && userRole !== Role.ADMIN && userId && account.userId !== userId) {
      throw new ForbiddenException('Bu hesabın verilerini görüntüleme yetkiniz yok');
    }

    return account;
  }

  async getDecryptedAccessToken(accountId: string): Promise<string | null> {
    const account = await this.findOne(accountId);
    if (!account.accessTokenEnc) {
      return null;
    }
    return this.tokenEncryption.decrypt(account.accessTokenEnc);
  }

  async getAccountMetrics(accountId: string, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);

    return this.prisma.accountMetric.findMany({
      where: { accountId },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async getAccountPosts(accountId: string, query: PostsQueryDto, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);

    const { cursor, limit = 10, sortBy = 'date', sortOrder = 'desc', contentType } = query;
    const take = limit + 1;

    const whereClause: Prisma.PostWhereInput = {
      accountId,
      ...(contentType ? { type: contentType } : {}),
    };

    let orderBy: Prisma.PostOrderByWithRelationInput = {};
    if (sortBy === 'engagement') {
      orderBy = { postMetrics: { engagementRate: sortOrder } };
    } else {
      orderBy = { postedAt: sortOrder };
    }

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      take,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      include: {
        postMetrics: true,
      },
      orderBy,
    });

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return {
      data: posts,
      meta: {
        nextCursor,
        limit,
      },
    };
  }

  async remove(id: string, userId: string, userRole: Role) {
    await this.findOne(id, userId, userRole);

    await this.cacheService.invalidatePattern(`overview:${id}:*`);

    try {
      const repeatableJobs = await this.collectQueue.getRepeatableJobs();
      const jobToRemove = repeatableJobs.find(
        (job) => job.id === `collect-${id}`,
      );
      if (jobToRemove) {
        await this.collectQueue.removeRepeatableByKey(jobToRemove.key);
      }
    } catch (e) {
      console.warn(`Repeatable job silinemedi (accountId: ${id}):`, e);
    }

    try {
      return await this.prisma.trackedAccount.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Hesap bulunamadı');
      }
      throw e;
    }
  }

  async getOverview(
    accountId: string,
    range: OverviewRange = '30d',
    userId: string,
    userRole: Role,
  ): Promise<AccountOverviewResponse> {
    await this.findOne(accountId, userId, userRole);

    const cacheKey = `overview:${accountId}:${range}`;
    const cached = await this.cacheService.get<AccountOverviewResponse>(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] Key: ${cacheKey}`);
      return cached;
    }
    console.log(`[Cache MISS] Key: ${cacheKey}`);

    const days = RANGE_TO_DAYS[range];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [earliestMetric, latestMetric, engagementAgg, postCount] =
      await Promise.all([
        this.prisma.accountMetric.findFirst({
          where: { accountId, capturedAt: { gte: startDate } },
          orderBy: { capturedAt: 'asc' },
        }),
        this.prisma.accountMetric.findFirst({
          where: { accountId },
          orderBy: { capturedAt: 'desc' },
        }),
        this.prisma.postMetric.aggregate({
          _avg: { engagementRate: true },
          where: {
            post: {
              accountId,
              postedAt: { gte: startDate },
            },
          },
        }),
        this.prisma.post.count({
          where: { accountId, postedAt: { gte: startDate } },
        }),
      ]);

    const startFollowers = earliestMetric?.followers ?? 0;
    const endFollowers = latestMetric?.followers ?? startFollowers;
    const absoluteChange = endFollowers - startFollowers;
    const percentChange =
      startFollowers > 0
        ? Number(((absoluteChange / startFollowers) * 100).toFixed(2))
        : 0;

    const postsPerWeek = Number(((postCount / days) * 7).toFixed(2));

    const result: AccountOverviewResponse = {
      accountId,
      range,
      followerGrowth: {
        start: startFollowers,
        end: endFollowers,
        absoluteChange,
        percentChange,
      },
      averageEngagementRate: Number(
        (engagementAgg._avg.engagementRate ?? 0).toFixed(2),
      ),
      postFrequency: {
        totalPosts: postCount,
        postsPerWeek,
      },
    };

    await this.cacheService.set(cacheKey, result, RANGE_TO_TTL_SECONDS[range]);

    return result;
  }

  async getSentimentBreakdown(
    accountId: string,
    userId: string,
    userRole: Role,
  ): Promise<PostSentimentBreakdown[]> {
    await this.findOne(accountId, userId, userRole);

    const posts = await this.prisma.post.findMany({
      where: { accountId },
      include: { comments: { select: { id: true } } },
      orderBy: { postedAt: 'desc' },
    });

    const allCommentIds = posts.reduce<string[]>(
      (acc, p) => acc.concat(p.comments.map((c) => c.id)),
      [],
    );

    if (allCommentIds.length === 0) {
      return posts.map((post) => ({
        postId: post.id,
        igMediaId: post.igMediaId,
        caption: post.caption,
        totalAnalyzedComments: 0,
        breakdown: {
          positive: { count: 0, percentage: 0 },
          negative: { count: 0, percentage: 0 },
          neutral: { count: 0, percentage: 0 },
        },
      }));
    }

    const analysisResults = await this.prisma.analysisResult.findMany({
      where: {
        subjectType: 'comment',
        subjectId: { in: allCommentIds },
        kind: 'sentiment',
      },
    });

    const KNOWN_LABELS: readonly SentimentLabel[] = [
      'positive',
      'negative',
      'neutral',
    ];
    const labelByCommentId = new Map<string, SentimentLabel>();
    for (const result of analysisResults) {
      const payload = result.payload as { label?: string };
      if (payload?.label && KNOWN_LABELS.includes(payload.label as SentimentLabel)) {
        labelByCommentId.set(result.subjectId, payload.label as SentimentLabel);
      }
    }

    return posts.map((post) => {
      const counts: Record<SentimentLabel, number> = {
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      let totalAnalyzed = 0;
      for (const comment of post.comments) {
        const label = labelByCommentId.get(comment.id);
        if (label) {
          counts[label] += 1;
          totalAnalyzed += 1;
        }
      }

      const toBreakdownEntry = (count: number) => ({
        count,
        percentage:
          totalAnalyzed > 0
            ? Number(((count / totalAnalyzed) * 100).toFixed(2))
            : 0,
      });

      return {
        postId: post.id,
        igMediaId: post.igMediaId,
        caption: post.caption,
        totalAnalyzedComments: totalAnalyzed,
        breakdown: {
          positive: toBreakdownEntry(counts.positive),
          negative: toBreakdownEntry(counts.negative),
          neutral: toBreakdownEntry(counts.neutral),
        },
      };
    });
  }

  async getHashtagAnalysis(accountId: string, userId: string, userRole: Role): Promise<HashtagAnalysis[]> {
    await this.findOne(accountId, userId, userRole);

    const analysisResult = await this.prisma.analysisResult.findFirst({
      where: {
        subjectId: accountId,
        kind: 'topics',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysisResult || !analysisResult.payload) {
      return [];
    }

    const payload = analysisResult.payload as any;
    const rawTopics = Array.isArray(payload.topics) ? payload.topics : [];
    const allKeywords = rawTopics.flatMap((topic: any) => topic.keywords || []);

    return allKeywords.map((item: any) => ({
      tag: item.word || item.tag || 'unknown',
      usageCount: item.count || 1,
      avgEngagement: item.score ?? 0,
    }));
  }

  async getTopicsAnalysis(accountId: string, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);
    const analysisResult = await this.prisma.analysisResult.findFirst({
      where: {
        subjectId: accountId,
        kind: 'topics',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysisResult || !analysisResult.payload) {
      return { status: 'no_data', total_topics: 0, topics: [] };
    }
    return analysisResult.payload;
  }

  async getBestTimes(accountId: string, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);

    const analysisResult = await this.prisma.analysisResult.findFirst({
      where: {
        subjectId: accountId,
        kind: {
          in: ['besttime', 'besttime-heuristic'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysisResult || !analysisResult.payload) {
      return { message: 'Best time analysis not found or payload is empty' };
    }

    return analysisResult.payload;
  }
}