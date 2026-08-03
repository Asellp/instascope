import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';  // <-- YENİ SATIR
import { AppModule } from './app.module';

async function bootstrap() {
  const app: any = await NestFactory.create(AppModule);

  app.use(cookieParser());  // <-- YENİ SATIR

  // class-validator doğrulamalarını aktif et
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Yapılandırması
  const config = new DocumentBuilder()
    .setTitle('Instascope API')
    .setDescription('Instascope backend servis dokümantasyonu')
    .setVersion('1.0')
    .addTag('accounts')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app as any, document);

  await app.listen(3000);
}
bootstrap();