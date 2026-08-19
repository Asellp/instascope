import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: any,
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();
    const retryAfter = Math.ceil(throttlerLimitDetail.timeToBlockExpire / 1000);

    // Frontend ekibinin kalan süreyi okuyabilmesi için header ekliyoruz
    response.header('Retry-After', retryAfter);

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.',
        retryAfterSeconds: retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}