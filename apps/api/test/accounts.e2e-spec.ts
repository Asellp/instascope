import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getQueueToken } from '@nestjs/bullmq';
import { AccountsController } from './../src/accounts/accounts.controller';
import { AccountsService } from './../src/accounts/accounts.service';
import { PrismaService } from './../src/prisma/prisma.service';

class PrismaMock {
  private accountSeq = 0;

  readonly accounts: Array<Record<string, any>> = [];

  trackedAccount = {
    create: async ({ data }: { data: Record<string, any> }) => {
      const account = {
        id: `account-${++this.accountSeq}`,
        status: 'active',
        ...data,
      };

      this.accounts.push(account);
      return account;
    },
    findMany: async () => this.accounts,
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.accounts.findIndex(account => account.id === where.id);

      if (index === -1) {
        throw new Error(`Account not found: ${where.id}`);
      }

      const [deleted] = this.accounts.splice(index, 1);
      return deleted;
    },
  };
}

class CollectQueueMock {
  readonly repeatableJobs: Array<{ id: string; key: string }> = [];

  add = async (
    _name: string,
    data: { accountId: string },
    options: { jobId?: string } = {},
  ) => {
    const jobId = options.jobId || data.accountId;
    const job = { id: jobId, key: `repeat-${jobId}` };

    this.repeatableJobs.push(job);
    return job;
  };

  getRepeatableJobs = async () => [...this.repeatableJobs];

  removeRepeatableByKey = async (key: string) => {
    const index = this.repeatableJobs.findIndex(job => job.key === key);

    if (index >= 0) {
      this.repeatableJobs.splice(index, 1);
    }
  };
}

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let queue: CollectQueueMock;

  beforeAll(async () => {
    prisma = new PrismaMock();
    queue = new CollectQueueMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('collect'), useValue: queue },
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

  it('/accounts (POST) - Başarılı hesap eklemeli', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/accounts')
      .send({
        igUsername: 'test_user',
        sourceType: 'instagram',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.igUsername).toBe('test_user');
    expect(queue.repeatableJobs).toHaveLength(1);
  });

  it('/accounts (GET) - Hesap listesini dönmeli', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/accounts')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
  });

  it('/accounts/:id (DELETE) - Oluşturulan hesabı silmeli', async () => {
    const createdAccountId = prisma.accounts[0]?.id;
    expect(createdAccountId).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/v1/accounts/${createdAccountId}`)
      .expect(200);

    expect(prisma.accounts).toHaveLength(0);
    expect(queue.repeatableJobs).toHaveLength(0);
  });
});
