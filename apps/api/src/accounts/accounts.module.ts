import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenEncryptionModule } from '../common/encryption/token-encryption.module';

@Module({
  imports: [
    PrismaModule,
    TokenEncryptionModule, // <-- Bunu ekliyoruz
    BullModule.registerQueue({
      name: 'collect',
    }),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}