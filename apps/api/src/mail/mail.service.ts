import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  // Dönüş tipini açıkça Promise<any> veya Promise<void> olarak belirtiyoruz:
  async sendPasswordResetEmail(to: string, rawToken: string): Promise<any> {
    const resetUrl = `http://localhost:3000/reset-password?token=${rawToken}`; // Portu 3000 yaptık

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