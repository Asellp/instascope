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
  // DEĞİŞTİ: Bu endpoint'ler artık JwtAuthGuard + RolesGuard ile korunuyor.
  // Silme işlemi ADMIN rolü gerektirdiği için, testte gerçek bir admin
  // kullanıcı oluşturup onunla login olmamız gerekiyor.
  const adminEmail = `test_admin_${Date.now()}@example.com`;
  const adminPassword = 'StrongPassword123!';
  // supertest agent: cookie'leri istekler arasında otomatik taşır,
  // elle Set-Cookie parse etmemize gerek kalmaz.
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

    // Register endpoint'i her zaman USER rolü atadığı için (güvenlik amaçlı,
    // kendi kendini admin yapamamalı), admin kullanıcıyı doğrudan DB'ye,
    // gerçek AuthService'teki ile aynı hash algoritmasıyla oluşturuyoruz.
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
    // Test verisini temizle: hem oluşturulan hesabı (varsa) hem admin kullanıcıyı.
    if (createdAccountId) {
      await prisma.trackedAccount
        .delete({ where: { id: createdAccountId } })
        .catch(() => {
          // Test içinde zaten silinmiş olabilir, sorun değil.
        });
    }
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  // 1. POST /accounts (Hesap Oluşturma Testi)
  it('/accounts (POST) - Başarılı hesap eklemeli', async () => {
    // DEĞİŞTİ: sourceType artık enum, 'instagram' geçersizdi (API/SCRAPE/MOCK/AI
    // dışında bir değer @IsEnum tarafından reddedilir). Ayrıca DTO'da alan adı
    // 'username', 'igUsername' değil.
    const response = await (agent.post('/accounts') as any).send({
      username: 'test_user',
      sourceType: 'API',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.igUsername).toBe('test_user');
    createdAccountId = response.body.id;
  });

  // 2. GET /accounts (Hesapları Listeleme Testi)
  it('/accounts (GET) - Hesap listesini dönmeli', async () => {
    await (agent.get('/accounts') as any).expect(200);
  });

  // 3. DELETE /accounts/:id (Hesap Silme Testi) - ADMIN rolü gerektirir
  it('/accounts/:id (DELETE) - Oluşturulan hesabı silmeli', async () => {
    if (!createdAccountId) return;

    await (agent.delete(`/accounts/${createdAccountId}`) as any).expect(200);

    // Silindiğini teyit ettikten sonra afterAll'da tekrar silmeye çalışmasın.
    createdAccountId = '';
  });
});