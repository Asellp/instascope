import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth Brute-Force & Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/login (POST) - 5 başarısız denemeden sonra 429 döndürmeli', async () => {
    const payload = { email: 'test@hacettepe.edu.tr', password: 'yanlis-sifre' };
    let lastResponse: any;

    // 5 kez yanlış şifre ile istek atılıyor (1-5 arası normal Unauthorized veya Rate Limit)
    for (let i = 0; i < 6; i++) {
      lastResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(payload);
    }

    // 6. denemede hesap kilitlendiği için 429 Too Many Requests dönmeli
    expect(lastResponse.status).toEqual(429);
  });
});