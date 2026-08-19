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
import { AuditService } from 'src/common/audit/audit.service';

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
    private readonly auditService: AuditService,
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
        scheduleCron: dto.frequency === 'daily' ? '0 0 * * *' : '0 */6 * * *',
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
          pattern: account.scheduleCron || '0 */6 * * *', // 6 saatte bir
        },
        jobId: `collect-${account.id}`,
      },
    );
    // 2. YENİ: Haftalık derin tarama işi (Örn: Pazar günleri saat 03:00'te deep: true bayrağıyla tetiklenir)
    await this.collectQueue.add(
      'collect-account-job',
      { accountId: account.id, igUsername: account.igUsername, deep: true },
      {
        repeat: {
          pattern: '0 3 * * 0', // Haftada bir, Pazar 03:00
        },
        jobId: `collect-deep-${account.id}`,
      },
    );
    await this.auditService.log({
      userId: userId,
      action: 'CREATE_ACCOUNT',
      resource: `account:${account.id}`,
    });

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
      
      // 1. Standart periyodik işi bul ve sil
      const standardJob = repeatableJobs.find(
        (job) => job.id === `collect-${id}`,
      );
      if (standardJob) {
        await this.collectQueue.removeRepeatableByKey(standardJob.key);
      }

      // 2. YENİ: Haftalık derin tarama işini bul ve sil
      const deepJob = repeatableJobs.find(
        (job) => job.id === `collect-deep-${id}`,
      );
      if (deepJob) {
        await this.collectQueue.removeRepeatableByKey(deepJob.key);
      }
    } catch (e) {
      console.warn(`Repeatable job silinemedi (accountId: ${id}):`, e);
    }

    try {
      const deletedAccount = await this.prisma.trackedAccount.delete({ where: { id } });

      // BURAYA EKLEMELİYİZ: Hesap silindiğinde audit log atılması
      await this.auditService.log({
        userId: userId,
        action: 'DELETE_ACCOUNT',
        resource: `account:${id}`,
      });
      return deletedAccount;
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
  // AI Tarafından İstenen Yeni Metot: getSentimentReasons
  async getSentimentReasons(accountId: string, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);

    const posts = await this.prisma.post.findMany({
      where: { accountId },
      select: { id: true, caption: true },
    });
    const postIds = posts.map(p => p.id);

    const results = await this.prisma.analysisResult.findMany({
      where: { subjectType: 'post', subjectId: { in: postIds }, kind: 'sentiment_reasons' },
    });

    const captionById = new Map(posts.map(p => [p.id, p.caption]));

    return results.map(r => {
      const payload = r.payload as any;
      return {
        postId: r.subjectId,
        caption: captionById.get(r.subjectId) ?? '',
        dominantLabel: payload.dominant_label,
        commentCount: payload.comment_count,
        keywords: payload.keywords,
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

  async getLikesBaseline(accountId: string, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);

    const analysisResult = await this.prisma.analysisResult.findFirst({
      where: {
        subjectType: 'account',
        subjectId: accountId,
        kind: 'likes_baseline',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysisResult || !analysisResult.payload) {
      return null;
    }

    const payload = analysisResult.payload as any;

    // snake_case gelebilecek alanları camelCase'e mapleme/garantiye alma
    return {
      mae: payload.mae ?? payload.MAE ?? 0,
      naiveMae: payload.naive_mae ?? payload.naiveMae ?? payload.naiveMAE ?? 0,
      modelType: payload.model_type ?? payload.modelType ?? 'ridge',
      beatsNaive: payload.beats_naive ?? payload.beatsNaive ?? false,
      sampleSize: payload.sample_size ?? payload.sampleSize ?? 0,
      createdAt: analysisResult.createdAt,
    };
  }

  async getSpamSummary(accountId: string, userId: string, userRole: Role) {
    await this.findOne(accountId, userId, userRole);

    // Hesaba bağlı tüm postları ve yorumların hem id'sini hem text'ini çekiyoruz
    const posts = await this.prisma.post.findMany({
      where: { accountId },
      include: { comments: { select: { id: true, text: true } } },
    });

    const commentTextMap = new Map<string, string>();
    const allCommentIds: string[] = [];

    for (const post of posts) {
      for (const comment of post.comments) {
        allCommentIds.push(comment.id);
        commentTextMap.set(comment.id, comment.text);
      }
    }

    if (allCommentIds.length === 0) {
      return {
        totalCommentsAnalyzed: 0,
        spamCount: 0,
        spamRate: 0,
        flaggedComments: [],
      };
    }

    // Bu yorumlara ait kind: 'spam' analiz sonuçlarını çekiyoruz
    const spamResults = await this.prisma.analysisResult.findMany({
      where: {
        subjectType: 'comment',
        subjectId: { in: allCommentIds },
        kind: 'spam',
      },
    });

    let spamCount = 0;
    const totalCommentsAnalyzed = spamResults.length;
    const flaggedComments: Array<{
      commentId: string;
      text: string;
      confidence: number;
    }> = [];

    for (const result of spamResults) {
      const payload = result.payload as {
        is_spam?: boolean;
        isSpam?: boolean;
        confidence?: number;
        score?: number;
      };
      
      const isSpam = payload?.is_spam ?? payload?.isSpam ?? false;

      if (isSpam) {
        spamCount += 1;
        flaggedComments.push({
          commentId: result.subjectId,
          text: commentTextMap.get(result.subjectId) || '',
          confidence: payload.confidence ?? payload.score ?? 0,
        });
      }
    }

    const spamRate =
      totalCommentsAnalyzed > 0
        ? Number(((spamCount / totalCommentsAnalyzed) * 100).toFixed(2))
        : 0;

    return {
      totalCommentsAnalyzed,
      spamCount,
      spamRate,
      flaggedComments,
    };
  }
}