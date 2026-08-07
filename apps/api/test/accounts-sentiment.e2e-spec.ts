import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PrismaClient, Role, SourceType } from '@prisma/client';
import { argon2id } from 'hash-wasm';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';

// B3.3 - Sözleşme testi: AI'nin analysis_results'a yazacağı "sentiment"
// kind'ının, bizim endpoint'imiz tarafından doğru işlendiğini doğrular.
// Amaç: AI gerçek veri yazmaya başladığında, formatın bizim beklediğimizle
// (subject_type: "comment", payload: { label, score }) uyuştuğunu garanti
// altına almak - format değişirse bu test kırılır ve hemen fark ederiz.
describe('AccountsController - Sentiment Contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let agent: ReturnType<typeof request.agent>;

  const adminEmail = `test_sentiment_admin_${Date.now()}@example.com`;
  const adminPassword = 'StrongPassword123!';

  let accountId: string;
  let postId: string;
  let commentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = new PrismaClient();

    const passwordHash = await argon2id({
      password: adminPassword,
      salt: crypto.randomBytes(16),
      parallelism: 1,
      iterations: 3,
      memorySize: 19456,
      hashLength: 32,
      outputType: 'encoded',
    });

    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: Role.ADMIN },
    });

    agent = request.agent(app.getHttpServer());
    await (agent.post('/auth/login') as any)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    // Test verisi: 1 hesap, 1 post, 1 yorum
    const account = await prisma.trackedAccount.create({
      data: {
        igUsername: `sentiment_test_${Date.now()}`,
        sourceType: SourceType.API,
        status: 'active',
      },
    });
    accountId = account.id;

    const post = await prisma.post.create({
      data: {
        accountId,
        igMediaId: `test_media_${Date.now()}`,
        type: 'IMAGE',
        caption: 'Test gönderisi',
        postedAt: new Date(),
      },
    });
    postId = post.id;

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorHash: 'test_author_hash',
        text: 'Harika bir paylaşım!',
        commentedAt: new Date(),
      },
    });
    commentId = comment.id;

    // AI'nin yazacağı formatın aynısı - bu şekil değişirse test kırılmalı
    await prisma.analysisResult.create({
      data: {
        subjectType: 'comment',
        subjectId: commentId,
        kind: 'sentiment',
        payload: { label: 'positive', score: 0.92 },
        modelVersion: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
      },
    });
  });

  afterAll(async () => {
    // Sırayla temizlik: AnalysisResult (FK'siz, elle silinmeli),
    // sonra TrackedAccount (cascade ile Post/Comment'i de siler),
    // sonra admin kullanıcı.
    await prisma.analysisResult.deleteMany({ where: { subjectId: commentId } });
    await prisma.trackedAccount
      .delete({ where: { id: accountId } })
      .catch(() => {});
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  it('AI\'nin sentiment payload formatını doğru işlemeli', async () => {
    const response = await (agent.get(`/accounts/${accountId}/sentiment`) as any)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);

    const [postSentiment] = response.body;

    expect(postSentiment.postId).toBe(postId);
    expect(postSentiment.totalAnalyzedComments).toBe(1);
    expect(postSentiment.breakdown.positive).toEqual({
      count: 1,
      percentage: 100,
    });
    expect(postSentiment.breakdown.negative).toEqual({
      count: 0,
      percentage: 0,
    });
    expect(postSentiment.breakdown.neutral).toEqual({
      count: 0,
      percentage: 0,
    });
  });

  it('AI beklenmedik bir label yazarsa sessizce yok saymalı, çökmemeli', async () => {
    // Sözleşme dışı bir değer geldiğinde (örn. AI'nin şemasında ileride
    // "mixed" gibi yeni bir label eklenirse) endpoint patlamamalı,
    // sadece o yorumu sayıma dahil etmemeli.
    const secondComment = await prisma.comment.create({
      data: {
        postId,
        authorHash: 'test_author_hash_2',
        text: 'Karışık duygular içindeyim',
        commentedAt: new Date(),
      },
    });

    await prisma.analysisResult.create({
      data: {
        subjectType: 'comment',
        subjectId: secondComment.id,
        kind: 'sentiment',
        payload: { label: 'mixed', score: 0.5 }, // sözleşme dışı değer
        modelVersion: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
      },
    });

    const response = await (agent.get(`/accounts/${accountId}/sentiment`) as any)
      .expect(200);

    const [postSentiment] = response.body;
    // "mixed" bilinen bir label olmadığı için sayıma dahil edilmemeli,
    // toplam hâlâ 1 olmalı (ilk yorumdan gelen "positive").
    expect(postSentiment.totalAnalyzedComments).toBe(1);

    await prisma.analysisResult.deleteMany({
      where: { subjectId: secondComment.id },
    });
    await prisma.comment.delete({ where: { id: secondComment.id } });
  });
});