import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, SourceType } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { CollectorProcessor } from '../src/collector/collector.processor';
import { RealDataSourceService } from '../src/sources/real-data-source.service';
import { CacheService } from '../src/cache/cache.service';

describe('CollectorProcessor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let processor: CollectorProcessor;
  let cacheService: CacheService;
  let testAccountId: string;

  const mockFetchPosts = jest.fn();
  const mockFetchComments = jest.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RealDataSourceService)
      .useValue({
        fetchPosts: mockFetchPosts,
        fetchComments: mockFetchComments,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    processor = moduleFixture.get(CollectorProcessor);
    cacheService = moduleFixture.get(CacheService);

    // Test hesabı oluştur
    const account = await prisma.trackedAccount.create({
      data: {
        igUsername: `collector_test_${Date.now()}`,
        sourceType: SourceType.API,
        status: 'active',
        igAccountId: 'test_ig_account_id',
        accessTokenEnc: 'fake_token',
      },
    });
    testAccountId = account.id;
  });

  afterAll(async () => {
    await prisma.comment.deleteMany({
      where: { post: { accountId: testAccountId } },
    });
    await prisma.postMetric.deleteMany({
      where: { post: { accountId: testAccountId } },
    });
    await prisma.post.deleteMany({ where: { accountId: testAccountId } });
    await prisma.collectionJob.deleteMany({ where: { accountId: testAccountId } });
    await prisma.trackedAccount.delete({ where: { id: testAccountId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('yeni post verisi toplandığında DB\'ye yazmalı ve overview cache\'ini invalidate etmeli', async () => {
    // 1. Cache'i önceden doldur (invalidation'ı gerçekten test edebilmek için)
    const cacheKey = `overview:${testAccountId}:30d`;
    await cacheService.set(cacheKey, { fake: 'cached-data' }, 300);

    const cachedBefore = await cacheService.get(cacheKey);
    expect(cachedBefore).toEqual({ fake: 'cached-data' });

    // 2. Mock API yanıtlarını hazırla
    mockFetchPosts.mockResolvedValue({
      data: [
        {
          id: `test_media_${Date.now()}`,
          caption: 'Test caption',
          timestamp: new Date().toISOString(),
          likesCount: 10,
          commentsCount: 2,
          reach: 50,
          views: 0,
        },
      ],
    });
    mockFetchComments.mockResolvedValue({ data: [] });

    // 3. Job'ı doğrudan işlet
    const fakeJob = { id: 'test-job-1', data: { accountId: testAccountId } } as any;
    await processor.process(fakeJob);

    // 4. Post gerçekten DB'ye yazılmış mı?
    const posts = await prisma.post.findMany({ where: { accountId: testAccountId } });
    expect(posts.length).toBe(1);
    expect(posts[0].caption).toBe('Test caption');

    // 5. PostMetric yazılmış mı?
    const metric = await prisma.postMetric.findUnique({ where: { postId: posts[0].id } });
    expect(metric).not.toBeNull();
    expect(metric?.likes).toBe(10);

    // 6. CollectionJob COMPLETED olarak işaretlenmiş mi?
    const job = await prisma.collectionJob.findFirst({
      where: { accountId: testAccountId },
      orderBy: { startedAt: 'desc' },
    });
    expect(job?.status).toBe('COMPLETED');
    expect(job?.itemsCollected).toBe(1);

    // 7. Asıl önemli kısım: cache invalidate edilmiş mi?
    const cachedAfter = await cacheService.get(cacheKey);
    expect(cachedAfter).toBeNull();
  });

  it('igAccountId eksikse job FAILED olarak işaretlenmeli', async () => {
    const accountWithoutIgId = await prisma.trackedAccount.create({
      data: {
        igUsername: `collector_test_noig_${Date.now()}`,
        sourceType: SourceType.API,
        status: 'active',
        igAccountId: null,
      },
    });

    const fakeJob = { id: 'test-job-2', data: { accountId: accountWithoutIgId.id } } as any;
    await processor.process(fakeJob);

    const job = await prisma.collectionJob.findFirst({
      where: { accountId: accountWithoutIgId.id },
    });
    expect(job?.status).toBe('FAILED');
    expect(job?.error).toContain('igAccountId');

    await prisma.collectionJob.deleteMany({ where: { accountId: accountWithoutIgId.id } });
    await prisma.trackedAccount.delete({ where: { id: accountWithoutIgId.id } });
  });
});