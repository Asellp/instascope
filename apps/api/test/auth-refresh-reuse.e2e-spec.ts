import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

// S2.1 - Refresh token reuse (yeniden kullanım) saldırı testi.
// Senaryo: Bir refresh token çalınıp kullanıldıktan sonra (rotate edildikten
// sonra), orijinal (artık "used") token tekrar kullanılmaya çalışılırsa,
// sistem bunu bir saldırı olarak algılayıp TÜM token ailesini (o oturuma
// ait tüm refresh token zincirini) iptal etmeli - hatta yeni rotate
// edilmiş, hâlâ "geçerli" olması gereken token bile artık işe yaramamalı.
describe('Auth - Refresh Token Reuse Detection (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const testEmail = `test_reuse_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

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

    await (request(app.getHttpServer()).post('/auth/register') as any)
      .send({ email: testEmail, password: testPassword })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  function extractCookieValue(cookies: string[], name: string): string {
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    if (!cookie) {
      throw new Error(`Cookie ${name} bulunamadı`);
    }
    return cookie.split(';')[0].split('=')[1];
  }

  it('çalınmış bir refresh token tekrar kullanıldığında tüm token ailesini iptal etmeli', async () => {
    // 1. Login ol, ilk refresh token'ı al
    const loginResponse = await (request(app.getHttpServer())
      .post('/auth/login') as any)
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const loginCookies = loginResponse.headers['set-cookie'] as unknown as string[];
    const refreshToken1 = extractCookieValue(loginCookies, 'refreshToken');

    // 2. Bu token'ı normal şekilde kullan (rotate et) - meşru bir refresh
    const firstRefreshResponse = await (request(app.getHttpServer())
      .post('/auth/refresh') as any)
      .send({ refreshToken: refreshToken1 })
      .expect(200);

    const refreshCookies = firstRefreshResponse.headers['set-cookie'] as unknown as string[];
    const refreshToken2 = extractCookieValue(refreshCookies, 'refreshToken');

    // refreshToken2, refreshToken1'den farklı olmalı (gerçekten rotate edilmiş)
    expect(refreshToken2).not.toBe(refreshToken1);

    // 3. SALDIRI SİMÜLASYONU: Artık "used" olan refreshToken1'i TEKRAR
    // kullanmaya çalış. Bu, çalınmış bir token'ın saldırgan tarafından
    // kullanılması senaryosunu temsil ediyor.
    const reuseResponse = await (request(app.getHttpServer())
      .post('/auth/refresh') as any)
      .send({ refreshToken: refreshToken1 });

    expect(reuseResponse.status).toBe(403);
    expect(reuseResponse.body.message).toContain('Saldırı tespit edildi');

    // 4. En kritik kontrol: reuse tespit edildiğinde, refreshToken2
    // (rotate edilmiş, aslında hâlâ "geçerli" olması gereken token) de
    // artık kullanılamamalı - çünkü tüm aile (family) silinmiş olmalı.
    // Bu olmasaydı, saldırgan orijinal token'ı kullanmasa bile kurbanın
    // rotate edilmiş token'ı hâlâ çalışır durumda kalırdı.
    const secondFamilyAttempt = await (request(app.getHttpServer())
      .post('/auth/refresh') as any)
      .send({ refreshToken: refreshToken2 });

    expect(secondFamilyAttempt.status).toBe(401);
  });
});