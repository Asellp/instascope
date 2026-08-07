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
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userName = body.name || body.email.split('@')[0];
    const { user, accessToken, refreshToken } = await this.authService.register(
      userName,
      body.email,
      body.password,
    );

    this.setTokenCookies(req, res, accessToken, refreshToken);

    return { user };
  }

  // 2. Kullanıcı Girişi (Login)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(
      body.email,
      body.password,
    );

    this.setTokenCookies(req, res, accessToken, refreshToken);

    return { user };
  }

  // 3. Oturum Doğrulama (GET /auth/me)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getUserById(req.user.id);
    return { user };
  }

  // 4. Çıkış Yapma (POST /auth/logout)
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
    const oldRefreshToken = req.cookies?.refreshToken || body.refreshToken;
    const { accessToken, refreshToken } =
      await this.authService.refreshTokens(oldRefreshToken);

    this.setTokenCookies(req, res, accessToken, refreshToken);
    return { success: true };
  }

  private setTokenCookies(
    req: Request,
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    // İsteğin HTTPS üzerinden (ngrok ile) gelip gelmediğini otomatik algılar
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}