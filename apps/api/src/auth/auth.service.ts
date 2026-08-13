import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service'; // <--- CacheService eklendi
import * as jwt from 'jsonwebtoken';
import { argon2Verify, argon2id } from 'hash-wasm';

@Injectable()
export class AuthService {
  private readonly jwtSecret = (() => {
    const s = process.env.JWT_SECRET;
    if (!s) {
      throw new Error('JWT_SECRET ortam değişkeni tanımlı değil.');
    }
    return s;
  })();

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService, // <--- Burada enjekte ediliyor
  ) {}

  async register(name: string, email: string, password: string) {
    const passwordHash = await argon2id({
      password,
      salt: crypto.randomBytes(16),
      parallelism: 1,
      iterations: 3,
      memorySize: 19456,
      hashLength: 32,
      outputType: 'encoded',
    });

    let user;
    try {
      user = await this.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
      }
      throw e;
    }

    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const tokens = await this.generateTokens(user.id, tokenFamily);

    return {
      user: { id: user.id, email: user.email, name: name || email.split('@')[0] },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const lockKey = `lock:login:${email}`;
    const attemptKey = `attempts:login:${email}`;

    // 1. Hesap kilitli mi kontrol et (Brute-force koruması)
    const isLocked = await this.cacheService.get(lockKey);
    if (isLocked) {
      throw new HttpException(
        'Çok fazla başarısız giriş denemesi. Lütfen 5 dakika sonra tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      await this.handleFailedLogin(attemptKey, lockKey);
      throw new UnauthorizedException('Geçersiz kimlik bilgileri');
    }

    const passwordValid = await argon2Verify({
      password,
      hash: user.passwordHash,
    });

    if (!passwordValid) {
      await this.handleFailedLogin(attemptKey, lockKey);
      throw new UnauthorizedException('Geçersiz kimlik bilgileri');
    }

    // Başarılı girişte sayaçları ve kilidi temizle
    // Başarılı girişte sayaçları ve kilidi temizle
    await (this.cacheService as any).del?.(attemptKey) || await (this.cacheService as any).delete?.(attemptKey);
    await (this.cacheService as any).del?.(lockKey) || await (this.cacheService as any).delete?.(lockKey);

    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const tokens = await this.generateTokens(user.id, tokenFamily);

    return {
      user: { id: user.id, email: user.email, name: user.email.split('@')[0] },
      ...tokens,
    };
  }

  private async handleFailedLogin(attemptKey: string, lockKey: string) {
    let attempts: any = (await this.cacheService.get(attemptKey)) || 0;
    attempts = Number(attempts) + 1;

    if (attempts >= 5) {
      // 5 başarısız denemede hesabı 5 dakika (300 saniye) kilitle
      await this.cacheService.set(lockKey, 'locked', 300);
      await (this.cacheService as any).delete?.(attemptKey) ?? await (this.cacheService as any).del?.(attemptKey);
      throw new HttpException(
        'Çok fazla başarısız deneme nedeniyle hesabınız 5 dakika süreyle kilitlendi.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Sayaç süresini 5 dakika olarak güncelle
    await this.cacheService.set(attemptKey, attempts, 300);
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    return {
      id: user.id,
      email: user.email,
      name: user.email.split('@')[0],
    };
  }

  async refreshTokens(oldRefreshTokenString: string) {
    if (!oldRefreshTokenString) throw new UnauthorizedException('Token bulunamadı');

    const incomingHash = this.hashToken(oldRefreshTokenString);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: incomingHash },
    });

    if (!storedToken) throw new UnauthorizedException('Geçersiz token');

    if (storedToken.used) {
      await this.prisma.refreshToken.deleteMany({
        where: { family: storedToken.family },
      });
      throw new ForbiddenException('Saldırı tespit edildi! Oturumunuz kapatıldı.');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Token süresi dolmuş');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { used: true },
    });

    return this.generateTokens(storedToken.userId, storedToken.family);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private async generateTokens(userId: string, family: string) {
    const accessToken = jwt.sign({ userId }, this.jwtSecret, {
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenHash,
        family,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}