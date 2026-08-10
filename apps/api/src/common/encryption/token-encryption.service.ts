import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bit
const NONCE_LENGTH = 12; // 96 bit - AES-GCM için önerilen boyut
const CURRENT_VERSION = 1;

interface EncryptedPayload {
  v: number;
  wrappedDek: string;
  dekNonce: string;
  dekAuthTag: string;
  dataNonce: string;
  dataAuthTag: string;
  ciphertext: string;
}

/**
 * S2.2 - Instagram OAuth token'ları için envelope encryption.
 *
 * Nasıl çalışır:
 * 1. Her şifreleme işleminde rastgele, tek kullanımlık bir Data Encryption
 *    Key (DEK) üretilir.
 * 2. Asıl veri (token) bu DEK ile AES-256-GCM kullanılarak şifrelenir.
 * 3. DEK'in kendisi, .env'deki master key ile şifrelenir ("sarılır" - wrap).
 * 4. Şifreli veri + sarılı DEK + nonce'lar + auth tag'ler tek bir blob
 *    olarak DB'ye yazılır.
 *
 * Neden envelope encryption (tek katman şifreleme yerine):
 * - Master key hiçbir zaman DB'ye yazılmaz, sadece env/KMS'de durur.
 * - DB dump'ı ele geçiren bir saldırgan, şifreli veriyi ve sarılı DEK'i
 *   görür ama master key olmadan DEK'i çözemez, dolayısıyla asıl veriyi
 *   de çözemez.
 * - İleride master key rotasyonu gerekirse, sadece DEK'leri yeniden sarmak
 *   yeterli olur, tüm token'ları yeniden şifrelemeye gerek kalmaz.
 *
 * Nonce yönetimi:
 * - Her şifreleme çağrısında (hem DEK sarma hem veri şifreleme için) YENİ,
 *   kriptografik olarak güvenli rastgele bir 96-bit nonce üretilir
 *   (crypto.randomBytes). Aynı anahtar+nonce çifti ASLA tekrar kullanılmaz.
 * - 96-bit rastgele nonce'ta çakışma olasılığı, bu ölçekteki bir sistem
 *   için ihmal edilebilir düzeydedir (doğum günü paradoksuna göre ~2^48
 *   şifreleme sonrası %50 çakışma riski - bizim hacmimizin çok üstünde).
 */
@Injectable()
export class TokenEncryptionService implements OnModuleInit {
  private masterKey!: Buffer;

  onModuleInit() {
    // Fallback YOK: master key .env'de tanımlı değilse uygulama
    // başlamamalı, sessizce şifrelemeden devam etmemeli.
    const base64Key = process.env.TOKEN_ENCRYPTION_MASTER_KEY;
    if (!base64Key) {
      throw new Error(
        'TOKEN_ENCRYPTION_MASTER_KEY ortam değişkeni tanımlı değil. ' +
          'Üretmek için: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
      );
    }

    const key = Buffer.from(base64Key, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `TOKEN_ENCRYPTION_MASTER_KEY 32 byte (256 bit) olmalı, ${key.length} byte geldi. ` +
          'Base64 ile encode edilmiş 32 byte'
      );
    }

    this.masterKey = key;
  }

  encrypt(plaintext: string): string {
    // 1. Tek kullanımlık Data Encryption Key üret
    const dek = crypto.randomBytes(KEY_LENGTH);

    // 2. Veriyi DEK ile şifrele
    const dataNonce = crypto.randomBytes(NONCE_LENGTH);
    const dataCipher = crypto.createCipheriv(ALGORITHM, dek, dataNonce);
    const ciphertext = Buffer.concat([
      dataCipher.update(plaintext, 'utf8'),
      dataCipher.final(),
    ]);
    const dataAuthTag = dataCipher.getAuthTag();

    // 3. DEK'i master key ile sar (wrap)
    const dekNonce = crypto.randomBytes(NONCE_LENGTH);
    const dekCipher = crypto.createCipheriv(ALGORITHM, this.masterKey, dekNonce);
    const wrappedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekAuthTag = dekCipher.getAuthTag();

    const payload: EncryptedPayload = {
      v: CURRENT_VERSION,
      wrappedDek: wrappedDek.toString('base64'),
      dekNonce: dekNonce.toString('base64'),
      dekAuthTag: dekAuthTag.toString('base64'),
      dataNonce: dataNonce.toString('base64'),
      dataAuthTag: dataAuthTag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  decrypt(blob: string): string {
    const payload = JSON.parse(
      Buffer.from(blob, 'base64').toString('utf8'),
    ) as EncryptedPayload;

    if (payload.v !== CURRENT_VERSION) {
      throw new Error(`Bilinmeyen şifreleme versiyonu: ${payload.v}`);
    }

    const wrappedDek = Buffer.from(payload.wrappedDek, 'base64');
    const dekNonce = Buffer.from(payload.dekNonce, 'base64');
    const dekAuthTag = Buffer.from(payload.dekAuthTag, 'base64');
    const dataNonce = Buffer.from(payload.dataNonce, 'base64');
    const dataAuthTag = Buffer.from(payload.dataAuthTag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    // DEK'i master key ile aç
    const dekDecipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, dekNonce);
    dekDecipher.setAuthTag(dekAuthTag);
    const dek = Buffer.concat([
      dekDecipher.update(wrappedDek),
      dekDecipher.final(),
    ]);

    // Veriyi DEK ile çöz
    const dataDecipher = crypto.createDecipheriv(ALGORITHM, dek, dataNonce);
    dataDecipher.setAuthTag(dataAuthTag);
    const plaintext = Buffer.concat([
      dataDecipher.update(ciphertext),
      dataDecipher.final(),
    ]);

    return plaintext.toString('utf8');
  }
}