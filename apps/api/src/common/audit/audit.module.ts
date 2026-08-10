// src/common/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService], // Diğer modüllerin kullanabilmesi için export ediyoruz!
})
export class AuditModule {}