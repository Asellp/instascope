import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Global yaparak her modülde ve testte doğrudan kullanılabilmesini sağlıyoruz
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}