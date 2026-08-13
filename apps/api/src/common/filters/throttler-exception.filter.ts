import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

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

    // Eğer hata 429 (Too Many Requests) ise şüpheli aktivite olarak logla
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.logger.warn(
        `ŞÜPHELİ AKTİVİTE (Rate Limit Aşıldı)! IP: ${request.ip}, Rota: ${request.url}, User-Agent: ${request.headers['user-agent']}`
      );
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