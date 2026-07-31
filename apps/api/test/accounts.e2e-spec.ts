import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let createdAccountId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. POST /accounts (Hesap Oluşturma Testi)
  it('/accounts (POST) - Başarılı hesap eklemeli', async () => {
    const response = await (request(app.getHttpServer())
      .post('/accounts') as any)
      .send({
        igUsername: 'test_user',
        sourceType: 'instagram',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.igUsername).toBe('test_user');
    createdAccountId = response.body.id;
  });

  // 2. GET /accounts (Hesapları Listeleme Testi)
  it('/accounts (GET) - Hesap listesini dönmeli', async () => {
    await request(app.getHttpServer())
      .get('/accounts')
      .expect(200);
  });

  // 3. DELETE /accounts/:id (Hesap Silme Testi)
  it('/accounts/:id (DELETE) - Oluşturulan hesabı silmeli', async () => {
    if (!createdAccountId) return;

    await request(app.getHttpServer())
      .delete(`/accounts/${createdAccountId}`)
      .expect(200);
  });
});