import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { AccountResponseDto } from './dto/response-account.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('accounts')
@ApiBearerAuth()
// Tüm controller artık JWT ile korunuyor.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'Hesap başarıyla oluşturuldu.',
    type: AccountResponseDto,
  })
  create(@Body() createAccountDto: CreateAccountDto, @Req() req: any) {
    // JWT guard sayesinde req.user dolu gelir. Kullanıcının ID'sini buradan alıyoruz.
    const userId = req.user.userId || req.user.id;
    return this.accountsService.create(createAccountDto, userId);
  }

  // Kullanıcı admin ise tümünü, normal kullanıcı ise sadece kendi hesaplarını görür.
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Req() req: any) {
    const user = req.user;
    return this.accountsService.findAll(user.userId || user.id, user.role);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.findOne(id, user.userId || user.id, user.role);
  }

  @Get(':id/metrics')
  @HttpCode(HttpStatus.OK)
  getAccountMetrics(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getAccountMetrics(id, user.userId || user.id, user.role);
  }

  @Get(':id/posts')
  @HttpCode(HttpStatus.OK)
  getAccountPosts(
    @Param('id') id: string,
    @Query() query: PostsQueryDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.accountsService.getAccountPosts(id, query, user.userId || user.id, user.role);
  }

  // B3.1 - GET /accounts/:id/overview?range=7d|30d|90d
  @Get(':id/overview')
  @HttpCode(HttpStatus.OK)
  getAccountOverview(
    @Param('id') id: string,
    @Query() query: OverviewQueryDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.accountsService.getOverview(id, query.range, user.userId || user.id, user.role);
  }

  // B3.3 - GET /accounts/:id/sentiment
  @Get(':id/sentiment')
  @HttpCode(HttpStatus.OK)
  getSentimentBreakdown(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getSentimentBreakdown(id, user.userId || user.id, user.role);
  }

  // B3.3 - GET /accounts/:id/hashtags
  @Get(':id/hashtags')
  @HttpCode(HttpStatus.OK)
  getHashtagAnalysis(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getHashtagAnalysis(id, user.userId || user.id, user.role);
  }

  @Get(':id/topics')
  getTopics(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getTopicsAnalysis(id, user.userId || user.id, user.role);
  }

  // Silme işlemi - sadece ADMIN rolü yapabilir.
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.remove(id, user.userId || user.id, user.role);
  }

  @Get(':id/best-times')
  async getBestTimes(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getBestTimes(id, user.userId || user.id, user.role);
  }
}