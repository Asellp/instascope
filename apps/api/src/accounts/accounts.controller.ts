import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Eklenecek Instagram kullanıcı adı',
    example: 'zeynep_dev',
  })
  @IsString({ message: 'Instagram kullanıcı adı metin olmalıdır.' })
  @IsNotEmpty({ message: 'Instagram kullanıcı adı boş bırakılamaz.' })
  igUsername!: string;

  @ApiProperty({
    description: 'Kaynak türü',
    example: 'instagram',
  })
  @IsString({ message: 'Kaynak türü metin olmalıdır.' })
  @IsNotEmpty({ message: 'Kaynak türü boş bırakılamaz.' })
  sourceType!: string;

  @ApiPropertyOptional({
    description: 'İsteğe bağlı erişim anahtarı',
  })
  @IsOptional()
  @IsString()
  accessTokenEnc?: string;
}

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}