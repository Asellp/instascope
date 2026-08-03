import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  // Master Key (KEK) - Sistem çevre değişkenlerinden (.env) beslenir
  private readonly masterKey: Buffer;

  constructor() {
    const keyStr = process.env.MASTER_ENCRYPTION_KEY;
    if (!keyStr || keyStr.length !== 64) {
      throw new InternalServerErrorException(
        'Kritik Güvenlik Hatası: MASTER_ENCRYPTION_KEY eksik veya 64 karakter (32 bytes hex) uzunluğunda değil!',
      );
    }
    this.masterKey = Buffer.from(keyStr, 'hex');
  }

  /**
   * 🔐 Envelope Encryption (Zarf Şifreleme)
   * Plaintext veriyi (OAuth Token) şifreler, DEK üretir ve DEK'i Master Key ile sarar.
   */
  encryptToken(plaintextToken: string) {
    try {
      // 1. Her şifreleme için benzersiz ve rastgele Veri Anahtarı (DEK) üret (AES-256 için 32 bytes)
      const dek = crypto.randomBytes(32);

      // 2. AES-256-GCM için benzersiz Nonce/IV üret (GCM için ideal ve güvenli uzunluk 12 bytes)
      const nonce = crypto.randomBytes(12);

      // 3. Token'ı bu benzersiz DEK ile şifrele
      const cipher = crypto.createCipheriv('aes-256-gcm', dek, nonce);
      let encryptedToken = cipher.update(plaintextToken, 'utf8', 'hex');
      encryptedToken += cipher.final('hex');

      // 4. GCM Bütünlük Etiketini al (Auth Tag)
      const authTag = cipher.getAuthTag().toString('hex');

      // 5. DEK'i sistemin Master Key'i (KEK) ile şifrele (Zarflama/Wrapping)
      const kCipher = crypto.createCipheriv('aes-256-ecb', this.masterKey, null);
      let encryptedDEK = kCipher.update(dek);
      encryptedDEK = Buffer.concat([encryptedDEK, kCipher.final()]);

      return {
        encryptedToken,
        nonce: nonce.toString('hex'),
        authTag,
        encryptedDEK: encryptedDEK.toString('hex'),
      };
    } catch (error) {
      throw new InternalServerErrorException('Şifreleme işlemi sırasında kriptografik hata oluştu.');
    }
  }

  /**
   * 🔓 Envelope Decryption (Zarf Şifresini Çözme)
   * Master Key ile şifreli DEK'i çözer, ardından çözülen DEK ile token'ı orijinal haline getirir.
   */
  decryptToken(params: {
    encryptedToken: string;
    nonce: string;
    authTag: string;
    encryptedDEK: string;
  }): string {
    try {
      const encryptedDEKBuffer = Buffer.from(params.encryptedDEK, 'hex');
      const nonceBuffer = Buffer.from(params.nonce, 'hex');
      const authTagBuffer = Buffer.from(params.authTag, 'hex');

      // 1. Şifreli DEK'i Master Key (KEK) kullanarak çöz (Unwrap)
      const kDecipher = crypto.createDecipheriv('aes-256-ecb', this.masterKey, null);
      let dek = kDecipher.update(encryptedDEKBuffer);
      dek = Buffer.concat([dek, kDecipher.final()]);

      // 2. Çözülen DEK ve Nonce ile orijinal Token'ın şifresini çöz
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, nonceBuffer);
      decipher.setAuthTag(authTagBuffer);

      let decrypted = decipher.update(params.encryptedToken, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException(
        'Şifre çözme hatası: Veri bütünlüğü bozulmuş veya geçersiz Master Key!',
      );
    }
  }
}