import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const internalToken = request.headers['x-internal-token'];

    // Çevresel değişkenlerden veya güvenli bir conf'tan gizli anahtarı alıyoruz
    const expectedToken =
      this.configService.get<string>('INTERNAL_SECRET_TOKEN') ||
      'instascope-secure-internal-secret-key';

    if (!internalToken || internalToken !== expectedToken) {
      throw new UnauthorizedException('Imzasız veya geçersiz iç token.');
    }

    return true;
  }
}