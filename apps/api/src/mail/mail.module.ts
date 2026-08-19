import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // AuthService'in kullanabilmesi için dışa açıyoruz
})
export class MailModule {}