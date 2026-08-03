import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Kullanıcı Kaydı (Register)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  // 2. Kullanıcı Girişi (Login)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  // 3. Token Yenileme (Refresh Token Rotasyonu & Saldırı Tespiti)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  // 4. Korumalı route: sadece geçerli JWT ile erişim
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(
    @Req() req: Request & { user?: { id: string; email: string; role: string } },
  ) {
    return req.user;
  }

  // 5. Role tabanlı erişim kontrolü örneği
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  getAdminData() {
    return { message: 'Sadece admin rolündeki kullanıcılar bu veriye erişebilir.' };
  }
}