import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // /health adresine istek atıldığında çalışacak olan fonksiyon
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(), // O anki tarih/saat bilgisi
    };
  }
}