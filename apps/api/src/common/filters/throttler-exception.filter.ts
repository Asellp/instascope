import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('SecurityLogger');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const reqAny = request as any;
      const clientIp = reqAny.ip || reqAny.socket?.remoteAddress || 'Bilinmiyor';
      
      // Headers nesnesine güvenli erişim için .get() metodu veya any cast:
      const userAgent = (request.headers as any)?.['user-agent'] || request.headers.get?.('user-agent') || 'Bilinmiyor';

      this.logger.warn(
        `ŞÜPHELİ AKTİVİTE (Rate Limit Aşıldı)! IP: ${clientIp}, Rota: ${request.url}, User-Agent: ${userAgent}`
      );

      // Throttler'ın koyduğu Retry-After başlığını alıyoruz (saniye cinsinden), yoksa varsayılan 60 sn veriyoruz
      const retryAfter = response.getHeader('Retry-After') || 60;

      return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'Çok fazla istek yapıldı. Lütfen biraz bekleyin.',
        retryAfterSeconds: Number(retryAfter), // <-- Frontend'in sayaç için kullanacağı saniye
      });
    }

    if (exception instanceof HttpException) {
      response.status(status).json(exception.getResponse());
    } else {
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
      });
    }
  }
}