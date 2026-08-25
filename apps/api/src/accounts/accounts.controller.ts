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
  HttpException,
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
// import { Throttle } from '@nestjs/throttler'; // Throttler kullanacaksanız aktif edin

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // @Throttle({ default: { limit: 3, ttl: 60000 } }) // Dakikada en fazla 3 hesap ekleme denemesi
  @ApiResponse({
    status: 201,
    description: 'Hesap başarıyla oluşturuldu.',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Çok fazla istek gönderildi. Lütfen bekleyin.',
  })
  create(@Body() createAccountDto: CreateAccountDto, @Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.accountsService.create(createAccountDto, userId);
  }

  @Post(':id/predict-likes')
  @HttpCode(HttpStatus.OK)
  // @Throttle({ default: { limit: 10, ttl: 60000 } }) // AI tahmin endpoint'ini spam'e karşı koruma
  async predictLikes(
    @Param('id') id: string,
    @Body() body: { hour: number; day_of_week: number; caption: string; content_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    return await this.accountsService.predictLikes(
      id,
      body.hour,
      body.day_of_week,
      body.caption,
      body.content_type,
      userId,
      userRole,
    );
  }

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
    @Query() query:PostsQueryDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.accountsService.getAccountPosts(id, query, user.userId || user.id, user.role);
  }

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

  @Get(':id/sentiment')
  @HttpCode(HttpStatus.OK)
  getSentimentBreakdown(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getSentimentBreakdown(id, user.userId || user.id, user.role);
  }

  @Get(':id/sentiment-reasons')
  @HttpCode(HttpStatus.OK)
  getSentimentReasons(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.accountsService.getSentimentReasons(id, user.userId || user.id, user.role);
  }

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

  @Get(':id/likes-baseline')
  async getLikesBaseline(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const userRole = req.user?.role;
    return this.accountsService.getLikesBaseline(id, userId, userRole);
  }

  @Get(':id/spam-summary')
  async getSpamSummary(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const userRole = req.user?.role;
    return this.accountsService.getSpamSummary(id, userId, userRole);
  }
}