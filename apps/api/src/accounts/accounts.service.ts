import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { igUsername: string; sourceType: string; accessTokenEnc?: string }) {
    return this.prisma.trackedAccount.create({ data });
  }

  async findAll() {
    return this.prisma.trackedAccount.findMany();
  }

  async remove(id: string) {
    return this.prisma.trackedAccount.delete({ where: { id } });
  }
}