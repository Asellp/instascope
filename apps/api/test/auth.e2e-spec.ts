import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { argon2Verify } from 'hash-wasm';
import { AuthController } from './../src/auth/auth.controller';
import { AuthService } from './../src/auth/auth.service';
import { PrismaService } from './../src/prisma/prisma.service';

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
};

type RefreshTokenRecord = {
  id: string;
  token: string;
  family: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

class PrismaMock {
  private userSeq = 0;
  private tokenSeq = 0;

  readonly users: UserRecord[] = [];

  refreshTokens: RefreshTokenRecord[] = [];

  user = {
    create: async ({ data }: { data: { email: string; passwordHash: string; role?: string } }) => {
      const user: UserRecord = {
        id: `user-${++this.userSeq}`,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role || 'user',
        createdAt: new Date(),
      };

      this.users.push(user);
      return user;
    },
    findUnique: async ({ where }: { where: { email: string } }) => {
      return this.users.find(user => user.email === where.email) || null;
    },
  };

  refreshToken = {
    findUnique: async ({ where }: { where: { token: string } }) => {
      return this.refreshTokens.find(token => token.token === where.token) || null;
    },
    create: async ({
      data,
    }: {
      data: { token: string; family: string; userId: string; expiresAt: Date };
    }) => {
      const token: RefreshTokenRecord = {
        id: `refresh-${++this.tokenSeq}`,
        token: data.token,
        family: data.family,
        userId: data.userId,
        expiresAt: data.expiresAt,
        used: false,
        createdAt: new Date(),
      };

      this.refreshTokens.push(token);
      return token;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Pick<RefreshTokenRecord, 'used'>>;
    }) => {
      const token = this.refreshTokens.find(item => item.id === where.id);

      if (!token) {
        throw new Error(`Refresh token not found: ${where.id}`);
      }

      Object.assign(token, data);
      return token;
    },
    deleteMany: async ({ where }: { where: { family: string } }) => {
      const before = this.refreshTokens.length;
      this.refreshTokens = this.refreshTokens.filter(token => token.family !== where.family);
      return { count: before - this.refreshTokens.length };
    },
  };
}

function decodeJwt(token: string) {
  return jwt.decode(token) as { iat: number; exp: number; [key: string]: any };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    prisma = new PrismaMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
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

  it('register route should hash passwords with argon2id', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'P@ssw0rd!123';

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    expect(response.body.email).toBe(email);
    expect(response.body.role).toBe('user');
    expect(response.body.passwordHash.startsWith('$argon2id$')).toBe(true);

    const storedUser = prisma.users.find(user => user.email === email);
    expect(storedUser).toBeDefined();
    expect(storedUser?.passwordHash).toBeDefined();
    expect(await argon2Verify({ password, hash: storedUser!.passwordHash })).toBe(true);
  });

  it('login route should issue 15m access token and 7d refresh token', async () => {
    const email = `login-${Date.now()}@example.com`;
    const password = 'P@ssw0rd!456';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');

    const accessPayload = decodeJwt(response.body.accessToken);
    const refreshPayload = decodeJwt(response.body.refreshToken);

    expect(accessPayload.exp - accessPayload.iat).toBe(15 * 60);
    expect(refreshPayload.exp - refreshPayload.iat).toBe(7 * 24 * 60 * 60);
    expect(prisma.refreshTokens).toHaveLength(1);
    expect(prisma.refreshTokens[0].used).toBe(false);
  });

  it('refresh route should rotate tokens and block reuse', async () => {
    const email = `reuse-${Date.now()}@example.com`;
    const password = 'P@ssw0rd!789';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const oldRefreshToken = loginResponse.body.refreshToken;
    const family = decodeJwt(oldRefreshToken).family;

    await sleep(1100);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);

    expect(refreshResponse.body.refreshToken).toBeDefined();
    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(prisma.refreshTokens.some(token => token.token === oldRefreshToken && token.used)).toBe(true);
    expect(prisma.refreshTokens.some(token => token.family === family)).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(403);

    expect(prisma.refreshTokens.filter(token => token.family === family)).toHaveLength(0);
  });
});
