import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
// import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { CollectorModule } from './collector/collector.module'; // <-- Yeni eklediğimiz modül

@Module({
  imports: [
    // Docker üzerinde çalışan Redis bağlantısını yapılandırıyoruz
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),

    AuthModule,     // <-- Güvenlik ve JWT modülünü buraya dahil ediyoruz
    AccountsModule,
    AuthModule,
    CollectorModule, // <-- Kuyruk modülünü buraya dahil ediyoruz
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
