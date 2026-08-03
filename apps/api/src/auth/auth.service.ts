import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { argon2Verify, argon2id } from 'hash-wasm';

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'super-secret-key';
  private readonly refreshSecret = process.env.REFRESH_SECRET || 'super-refresh-key';

  constructor(private prisma: PrismaService) {}

  // 1. Kullanıcı Kaydı (Argon2id Şifreleme)
  async register(email: string, password: string) {
    const passwordHash = await argon2id({
      password,
      salt: crypto.randomBytes(16),
      parallelism: 1,
      iterations: 3,
      memorySize: 4096,
      hashLength: 32,
      outputType: 'encoded',
    });
    return this.prisma.user.create({
      data: { email, passwordHash },
    });
  }

  // 2. Giriş ve Rotasyon Ailesi Başlatma
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const passwordValid = await argon2Verify({
      password,
      hash: user.passwordHash,
    });
    if (!passwordValid) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const tokenFamily = crypto.randomBytes(16).toString('hex');
    return this.generateTokens(user.id, tokenFamily);
  }

  // 3. Refresh Token Rotasyonu & Saldırı Tespiti
  async refreshTokens(oldRefreshTokenString: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshTokenString },
    });

    if (!storedToken) throw new UnauthorizedException('Geçersiz token');

    // 🚨 REUSE DETECTION (Çalınmış Token Tespiti)
    if (storedToken.used) {
      await this.prisma.refreshToken.deleteMany({
        where: { family: storedToken.family },
      });
      throw new ForbiddenException('Saldırı tespit edildi! Oturumunuz güvenlik nedeniyle kapatıldı.');
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

  private async generateTokens(userId: string, family: string) {
    const accessToken = jwt.sign({ userId }, this.jwtSecret, { expiresIn: '15m' });
    const refreshTokenString = jwt.sign({ userId, family }, this.refreshSecret, { expiresIn: '7d' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        family,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenString };
  }
}
