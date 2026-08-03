import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
// import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { CollectorModule } from './collector/collector.module';
import { AuthModule } from './auth/auth.module'; // <-- Auth modülünü ekliyoruz

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
    CollectorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}