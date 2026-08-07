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
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(createAccountDto);
  }

  // Sadece ADMIN rolüne sahip kullanıcılar tüm hesapları listeleyebilir.
  @Roles(Role.ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.accountsService.findAll();
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
  getAccountPosts(@Param('id') id: string, @Query() query: PostsQueryDto) {
    return this.accountsService.getAccountPosts(id, query);
  }

  // B3.1 - GET /accounts/:id/overview?range=7d|30d|90d
  // Takipçi büyümesi, ortalama etkileşim, gönderi sıklığı.
  @Get(':id/overview')
  @HttpCode(HttpStatus.OK)
  getAccountOverview(
    @Param('id') id: string,
    @Query() query: OverviewQueryDto,
  ) {
    return this.accountsService.getOverview(id, query.range);
  }

  // B3.3 - GET /accounts/:id/sentiment
  // Post bazlı yorum sentiment dağılımı (AI'nin analysis_results'a
  // yazdığı kind: "sentiment" kayıtlarına dayanıyor).
  @Get(':id/sentiment')
  @HttpCode(HttpStatus.OK)
  getSentimentBreakdown(@Param('id') id: string) {
    return this.accountsService.getSentimentBreakdown(id);
  }

  // B3.3 - GET /accounts/:id/hashtags
  // Hesaba ait hashtag analiz sonuçları (AI'nin analysis_results'a
  // yazdığı kind: "hashtag-analysis" kayıtlarına dayanıyor).
  @Get(':id/hashtags')
  @HttpCode(HttpStatus.OK)
  getHashtagAnalysis(@Param('id') id: string) {
    return this.accountsService.getHashtagAnalysis(id);
  }

  // Silme işlemi - sadece ADMIN rolü yapabilir.
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }

  @Get(':id/best-times')
  async getBestTimes(@Param('id') id: string) {
    return this.accountsService.getBestTimes(id);
  }
}