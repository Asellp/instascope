import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('CryptoService (Envelope Encryption)', () => {
  let service: CryptoService;
  // Test için 32-byte (64 karakter hex) Master Key
  const MOCK_MASTER_KEY = '63a9f82c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f';

  beforeEach(async () => {
    process.env.MASTER_ENCRYPTION_KEY = MOCK_MASTER_KEY;
    
// ...existing code...
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });
  // ...existing code...
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('🔓 Başarıyla şifrelemeli ve geri çözebilmeli (Round-trip)', () => {
    const rawToken = 'IG_OAUTH_TOKEN_EXAMPLE_123456789_SECRET';
    
    // 1. Şifrele
    const encryptedResult = service.encryptToken(rawToken);
    expect(encryptedResult.encryptedToken).toBeDefined();
    expect(encryptedResult.nonce).toBeDefined();
    expect(encryptedResult.authTag).toBeDefined();
    expect(encryptedResult.encryptedDEK).toBeDefined();

    // 2. Çöz
    const decryptedToken = service.decryptToken(encryptedResult);
    expect(decryptedToken).toEqual(rawToken);
  });

  it('🔄 Her şifrelemede benzersiz Nonce (IV) ve DEK üretilmeli (Asla Tekrar Yok)', () => {
    const rawToken = 'same_token_value';
    
    const res1 = service.encryptToken(rawToken);
    const res2 = service.encryptToken(rawToken);

    // Aynı veri şifrelense bile çıktılar tamamen farklı olmalı
    expect(res1.nonce).not.toEqual(res2.nonce);
    expect(res1.encryptedToken).not.toEqual(res2.encryptedToken);
    expect(res1.encryptedDEK).not.toEqual(res2.encryptedDEK);
  });

  it('🚨 Master Key eksik veya hatalıysa constructor hata fırlatmalı', () => {
    process.env.MASTER_ENCRYPTION_KEY = 'short_key';
    expect(() => new CryptoService()).toThrow(InternalServerErrorException);
  });

  it('💥 Şifreli veri üzerinde oynama yapılırsa (Auth Tag hatası) çözme işlemi reddedilmeli', () => {
    const rawToken = 'secure_data';
    const encryptedResult = service.encryptToken(rawToken);
    
    // Şifreli metnin son karakterini değiştirerek bütünlüğü bozuyoruz
    encryptedResult.encryptedToken = encryptedResult.encryptedToken.substring(0, encryptedResult.encryptedToken.length - 1) + '0';

    expect(() => service.decryptToken(encryptedResult)).toThrow(InternalServerErrorException);
  });
});