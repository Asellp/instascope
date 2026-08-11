import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app: any = await NestFactory.create(AppModule);

  // CORS ve credentials ayarı (Frontend'den gelen çerez ve istekler için)
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001',
      'http://127.0.01:3000',
      'https://blurb-demanding-protrude.ngrok-free.dev'
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, ngrok-skip-browser-warning',
  });

  app.use(cookieParser());

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
  
  // Swagger UI'ın tarayıcıdaki cookie'leri (credentials) isteklerde gönderebilmesi için:
  SwaggerModule.setup('docs', app as any, document, {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
  });
  await app.listen(3000);
}
bootstrap();