import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// JwtStrategy.validate()'in döndürdüğü şekille birebir uyumlu.
// req.user.userId DEĞİL, req.user.id kullanılmalı (bir önceki bug buradaydı).
interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Kullanıcı Kaydı (Register)
  // TODO: Bu endpoint'e de @nestjs/throttler ile rate limit eklenmeli
  // (otomatik hesap oluşturma / spam kaydına karşı).
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userName = body.name || body.email.split('@')[0];
    const { user, accessToken, refreshToken } = await this.authService.register(
      userName,
      body.email,
      body.password,
    );

    this.setTokenCookies(res, accessToken, refreshToken);

    return { user };
  }

  // 2. Kullanıcı Girişi (Login)
  // TODO: Brute-force koruması için @nestjs/throttler ile IP başına
  // limit eklenmeli (örn. dakikada 5 deneme). Şu an sınırsız deneme mümkün.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(
      body.email,
      body.password,
    );

    this.setTokenCookies(res, accessToken, refreshToken);

    return { user };
  }

  // 3. Oturum Doğrulama (GET /auth/me)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: AuthenticatedRequest) {
    // JwtAuthGuard zaten geçersiz/eksik token'da 401 fırlatıyor,
    // buraya geldiysek req.user garantili dolu - ekstra kontrol gereksizdi.
    const user = await this.authService.getUserById(req.user.id);
    return { user };
  }

  // 4. Çıkış Yapma (POST /auth/logout)
  // Artık guard'lı: kullanıcının kimliğini bilmemiz gerekiyor ki
  // DB'deki refresh token kaydını gerçekten invalidate edebilelim.
  // Öncesinde sadece cookie temizleniyordu, DB'deki token hâlâ geçerli kalıyordu.
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { success: true };
  }

  // 5. Token Yenileme
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Cookie öncelikli (browser client), body ise header/mobil client desteği için.
    // Artık RefreshTokenDto üzerinden class-validator devrede (öncesinde
    // req.body doğrudan okunduğu için validasyon hiç çalışmıyordu).
    const oldRefreshToken = req.cookies?.refreshToken || body.refreshToken;
    const { accessToken, refreshToken } =
      await this.authService.refreshTokens(oldRefreshToken);

    this.setTokenCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 dakika
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    });
  }
}