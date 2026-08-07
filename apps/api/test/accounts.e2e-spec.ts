import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PrismaClient, Role } from '@prisma/client';
import { argon2id } from 'hash-wasm';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let createdAccountId: string;

  const adminEmail = `test_admin_${Date.now()}@example.com`;
  const adminPassword = 'StrongPassword123!';
  let agent: ReturnType<typeof request.agent>;

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
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    agent = request.agent(app.getHttpServer());
    await (agent.post('/auth/login') as any)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
  });

  afterAll(async () => {
    if (createdAccountId) {
      await prisma.trackedAccount
        .delete({ where: { id: createdAccountId } })
        .catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  // 1. POST /accounts (Hesap Oluşturma)
  it('/accounts (POST) - Başarılı hesap eklemeli', async () => {
    const response = await (agent.post('/accounts') as any).send({
      username: 'test_user',
      sourceType: 'API',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.igUsername).toBe('test_user');
    createdAccountId = response.body.id;
  });

  // 2. GET /accounts (Hesap Listeleme)
  it('/accounts (GET) - Hesap listesini dönmeli', async () => {
    await (agent.get('/accounts') as any).expect(200);
  });

  // 3. GET /accounts/:id/overview (Overview Analitiği)
  it('/accounts/:id/overview (GET) - Hesap overview verisini dönmeli', async () => {
    if (!createdAccountId) return;

    const response = await (
      agent.get(`/accounts/${createdAccountId}/overview?range=30d`) as any
    ).expect(200);

    expect(response.body).toHaveProperty('accountId', createdAccountId);
    expect(response.body).toHaveProperty('followerGrowth');
    expect(response.body).toHaveProperty('averageEngagementRate');
  });

  // 4. GET /accounts/:id/sentiment (Sentiment Analizi)
  it('/accounts/:id/sentiment (GET) - Sentiment dökümünü dönmeli', async () => {
    if (!createdAccountId) return;

    const response = await (
      agent.get(`/accounts/${createdAccountId}/sentiment`) as any
    ).expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  // 5. DELETE /accounts/:id (Hesap Silme) - ADMIN rolü gerektirir
  it('/accounts/:id/DELETE - Oluşturulan hesabı silmeli', async () => {
    if (!createdAccountId) return;

    await (agent.delete(`/accounts/${createdAccountId}`) as any).expect(200);
    createdAccountId = '';
  });
});