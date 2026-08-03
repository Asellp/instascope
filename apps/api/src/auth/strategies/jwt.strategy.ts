import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Access token'ı önce Authorization header'dan (Bearer), yoksa httpOnly cookie'den okur.
// Bu sayede hem mobil/servis-servis (Bearer token) hem browser (cookie) istemcileri desteklenir.
const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.accessToken || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Fallback KESİNLİKLE kaldırıldı: secret tanımlı değilse uygulama
      // başlamamalı, sessizce zayıf bir default'a düşmemeli.
      throw new Error(
        'JWT_SECRET ortam değişkeni tanımlı değil. Uygulama başlatılamıyor.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'], // alg confusion saldırılarına karşı explicit belirtiyoruz
    });
  }

  async validate(payload: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Geçersiz token');
    }

    // Bu obje req.user olarak set edilir. Controller'larda tip tutarlılığı
    // için bu şekli kullanan ortak bir AuthenticatedUser interface'i
    // tanımlayıp import etmeni öneririm (auth.controller.ts'de req.user.userId
    // yerine req.user.id kullanılması gerekiyordu - bir önceki mesajdaki bug).
    return user; // { id, email, role }
  }
}