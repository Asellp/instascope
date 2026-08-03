import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { argon2Verify, argon2id } from 'hash-wasm';

@Injectable()
export class AuthService {
  // Fallback KALDIRILDI: JWT_SECRET tanımlı değilse uygulama açılışta patlamalı,
  // sessizce herkesin bildiği bir default'a düşmemeli.
  private readonly jwtSecret = (() => {
    const s = process.env.JWT_SECRET;
    if (!s) {
      throw new Error('JWT_SECRET ortam değişkeni tanımlı değil.');
    }
    return s;
  })();

  // refreshSecret artık gerekli değil: refresh token'lar JWT olarak değil,
  // opaque random string + DB'de hash olarak saklanıyor (aşağıya bakınız).

  constructor(private prisma: PrismaService) {}

  async register(name: string, email: string, password: string) {
    const passwordHash = await argon2id({
      password,
      salt: crypto.randomBytes(16),
      parallelism: 1,
      iterations: 3,
      memorySize: 19456, // ~19 MB - OWASP önerisine uygun (önceki 4096 = 4MB zayıftı)
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
      // Prisma unique constraint ihlali (email zaten kayıtlı).
      // Önceden yakalanmıyordu, client'a 500 + stack trace sızabiliyordu.
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
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const passwordValid = await argon2Verify({
      password,
      hash: user.passwordHash,
    });
    if (!passwordValid) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const tokens = await this.generateTokens(user.id, tokenFamily);

    return {
      user: { id: user.id, email: user.email, name: user.email.split('@')[0] },
      ...tokens,
    };
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

    // Client'tan gelen ham token'ı hash'leyip DB'de hash üzerinden arıyoruz.
    // DB'de asla ham token tutulmuyor - sızıntı olsa bile token'lar
    // doğrudan kullanılamaz.
    const incomingHash = this.hashToken(oldRefreshTokenString);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: incomingHash },
    });

    if (!storedToken) throw new UnauthorizedException('Geçersiz token');

    if (storedToken.used) {
      // Reuse detection: kullanılmış bir refresh token tekrar geldiyse
      // muhtemelen çalınmıştır - tüm aileyi (tüm oturum zincirini) iptal et.
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

  // Kullanıcının tüm refresh token'larını (tüm cihaz/oturumlarını) invalidate eder.
  // AuthController.logout() tarafından çağrılıyor. Şu an tüm session'ları kapatıyor;
  // yalnızca mevcut cihazı kapatmak istersen family bilgisini de controller'dan
  // geçirip sadece o family'i silecek şekilde genişletebiliriz.
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

    // Refresh token artık JWT değil: yüksek entropili opaque random string.
    // Ham hali client'a gönderilir, DB'de sadece hash'i saklanır.
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