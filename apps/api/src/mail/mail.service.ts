import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<any> {
    // Frontend URL'ini .env'den alıyoruz, yoksa varsayılan olarak localhost:3000 kullanıyoruz
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      const data = await this.resend.emails.send({
        from: 'Instascope <onboarding@resend.dev>',
        to: [to],
        subject: 'Şifre Sıfırlama Talebi',
        html: `<p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p><p><a href="${resetUrl}">Şifremi Sıfırla</a></p>`,
      });

      return data;
    } catch (error) {
      console.error('[Resend API Error]:', error);
      throw error;
    }
  }
}