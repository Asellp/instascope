import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'super-secret-key';
  private readonly refreshSecret = process.env.REFRESH_SECRET || 'super-refresh-key';

  constructor(private prisma: PrismaService) {}

  // 1. Kullanıcı Kaydı (Argon2id Şifreleme)
  async register(email: string, password: string) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });
    return this.prisma.user.create({
      data: { email, passwordHash },
    });
  }

  // 2. Giriş ve Rotasyon Ailesi Başlatma
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const tokenFamily = uuidv4();
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