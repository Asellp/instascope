import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  // DEĞİŞTİ: Tek bir test email'i, tüm test bloğu boyunca kullanılıyor,
  // sonunda afterAll'da temizleniyor - artık her çalıştırmada DB'de kalıcı
  // "test_..." kullanıcıları birikmeyecek.
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // DEĞİŞTİ: Gerçek main.ts'teki app.use(cookieParser()) burada da
    // uygulanmalı, yoksa cookie tabanlı auth testleri gerçek davranışı yansıtmaz.
    app.use(cookieParser());
    await app.init();

    prisma = new PrismaClient();
  });

  afterAll(async () => {
    // DEĞİŞTİ: Test kullanıcısını ve varsa refresh token kayıtlarını temizle.
    // Prisma'daki RefreshToken -> User onDelete: Cascade olduğu için
    // sadece user'ı silmek yeterli, ilişkili refresh token'lar otomatik gider.
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  it('/auth/me (GET) - should return 401 when unauthorized', async () => {
    // DEĞİŞTİ: /auth/profile böyle bir endpoint hiç yok (AppController'daki
    // ilgisiz /profile ile karışıyordu, muhtemelen 404 dönüyordu ama test
    // "401 bekliyorum" diyordu - gerçek guard'lı endpoint /auth/me kullanılmalı.
    await (request(app.getHttpServer()).get('/auth/me') as any).expect(401);
  });

  it('/auth/register & /auth/login & /auth/refresh - should handle auth & refresh flow', async () => {
    // Register (200 OK - AuthController'da @HttpCode(HttpStatus.OK) kullanılıyor,
    // varsayılan POST 201 değil)
    await (request(app.getHttpServer())
      .post('/auth/register') as any)
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    // Login (200 OK)
    const loginResponse = await (request(app.getHttpServer())
      .post('/auth/login') as any)
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    // DEĞİŞTİ: Token'lar artık response body'de değil, httpOnly cookie
    // olarak geliyor (setTokenCookies). Set-Cookie header'ından parse ediyoruz.
    const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();

    const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='));
    const refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();

    const accessToken = accessTokenCookie!.split(';')[0].split('=')[1];
    const refreshToken = refreshTokenCookie!.split(';')[0].split('=')[1];

    // Korumalı route'a cookie ile erişim (200 OK)
    await (request(app.getHttpServer())
      .get('/auth/me') as any)
      .set('Cookie', [`accessToken=${accessToken}`])
      .expect(200);

    // Refresh token akışı (200 OK) - RefreshTokenDto artık @Body() ile okunuyor
    const refreshResponse = await (request(app.getHttpServer())
      .post('/auth/refresh') as any)
      .send({ refreshToken })
      .expect(200);

    expect(refreshResponse.body.success).toBe(true);
  });
});