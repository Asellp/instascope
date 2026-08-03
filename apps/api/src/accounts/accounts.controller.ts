import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountResponseDto } from './dto/response-account.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@ApiTags('accounts')
@ApiBearerAuth()
// Tüm controller artık JWT ile korunuyor - önceden hiç guard yoktu,
// kimlik doğrulaması olmadan hesap ekleme/silme/listeleme mümkündü.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async findAll() {
    const accounts = await this.accountsService.findAll();
    return plainToInstance(AccountResponseDto, accounts, {
      excludeExtraneousValues: false,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Get(':id/metrics')
  @HttpCode(HttpStatus.OK)
  getAccountMetrics(@Param('id') id: string) {
    return this.accountsService.getAccountMetrics(id);
  }

  @Get(':id/posts')
  @HttpCode(HttpStatus.OK)
  getAccountPosts(@Param('id') id: string) {
    return this.accountsService.getAccountPosts(id);
  }

  // Silme işlemi ekstra kritik - sadece ADMIN rolü yapabilsin.
  // RolesGuard zaten kurulmuştu ama hiçbir yerde kullanılmıyordu, ilk kullanımı burada.
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}