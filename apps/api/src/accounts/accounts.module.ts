import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaModule } from '../prisma/prisma.module'; // Yolunu kendi klasör yapına göre kontrol et

@Module({
  imports: [PrismaModule], // <-- PrismaModule buraya eklenmeli
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}