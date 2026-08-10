// src/common/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateAuditLogDto {
  userId?: string;
  action: string;
  resource: string;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: CreateAuditLogDto) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          resource: data.resource,
          ip: data.ip || null,
        },
      });
    } catch (e) {
      console.error('Audit log kaydedilirken hata oluştu:', e);
    }
  }
}