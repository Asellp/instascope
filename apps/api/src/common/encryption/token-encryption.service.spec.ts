import { TokenEncryptionService } from './token-encryption.service';

function makeService(masterKeyBase64: string): TokenEncryptionService {
  process.env.TOKEN_ENCRYPTION_MASTER_KEY = masterKeyBase64;
  const service = new TokenEncryptionService();
  service.onModuleInit();
  return service;
}

function randomMasterKey(): string {
  return require('crypto').randomBytes(32).toString('base64');
}

describe('TokenEncryptionService', () => {
  const originalEnv = process.env.TOKEN_ENCRYPTION_MASTER_KEY;

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_MASTER_KEY = originalEnv;
  });

  it('şifreleyip çözünce orijinal metni geri vermeli (round-trip)', () => {
    const service = makeService(randomMasterKey());
    const plaintext = 'IGQVJYbWFrZALTOKENvalue1234567890';

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('aynı metni iki kez şifreleyince farklı ciphertext üretmeli (nonce tekrar etmiyor)', () => {
    const service = makeService(randomMasterKey());
    const plaintext = 'aynı-token-değeri';

    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);

    // Nonce'lar (ve DEK) her seferinde rastgele üretildiği için, aynı
    // plaintext'ten bile tamamen farklı ciphertext çıkmalı.
    expect(encrypted1).not.toBe(encrypted2);

    // Ama ikisi de aynı plaintext'e çözülmeli.
    expect(service.decrypt(encrypted1)).toBe(plaintext);
    expect(service.decrypt(encrypted2)).toBe(plaintext);
  });

  it('şifreli veri manipüle edilirse (tampering) çözme işlemi hata fırlatmalı', () => {
    const service = makeService(randomMasterKey());
    const encrypted = service.encrypt('gizli-token');

    const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
    // ciphertext'in bir baytını değiştir (saldırganın veriyi bozmaya
    // çalıştığı senaryo - GCM auth tag bunu yakalamalı)
    const tamperedCiphertext = Buffer.from(payload.ciphertext, 'base64');
    tamperedCiphertext[0] = tamperedCiphertext[0] ^ 0xff;
    payload.ciphertext = tamperedCiphertext.toString('base64');

    const tamperedBlob = Buffer.from(JSON.stringify(payload)).toString('base64');

    expect(() => service.decrypt(tamperedBlob)).toThrow();
  });

  // DoD senaryosu: "DB dump'ı ele geçiren saldırgan token'ları okuyamaz"
  it('DB dump senaryosu: master key olmadan şifreli veri asla çözülemez', () => {
    // Gerçek servis, kendi master key'i (env/KMS'de, DB'de DEĞİL) ile şifreliyor.
    const realService = makeService(randomMasterKey());
    const realToken = 'IGQVJYbWFrZALTOKENvalue-gercek-instagram-tokeni';
    const encryptedInDb = realService.encrypt(realToken);

    // Saldırgan senaryosu: PostgreSQL dump'ını ele geçirdi, yani sadece
    // `encryptedInDb` blob'una erişimi var - master key'e (env değişkeni,
    // asla DB'de saklanmaz) erişimi YOK. Saldırganın elindeki tek şey
    // rastgele bir master key ile kurulmuş kendi servis instance'ı
    // (yani gerçek key'i bilmiyor).
    const attackerService = makeService(randomMasterKey()); // farklı, rastgele key

    // Saldırgan DB'den çaldığı blob'u kendi (yanlış) master key'iyle
    // çözmeye çalışıyor - başarısız olmalı.
    expect(() => attackerService.decrypt(encryptedInDb)).toThrow();

    // Ayrıca doğrulama: şifreli blob'un içinde plaintext token'ın hiçbir
    // okunabilir izi olmamalı (base64/JSON içinde düz metin arama).
    const decodedForInspection = Buffer.from(encryptedInDb, 'base64').toString('utf8');
    expect(decodedForInspection).not.toContain(realToken);
  });

  it('master key .env\'de tanımlı değilse uygulama başlamamalı (fallback yok)', () => {
    delete process.env.TOKEN_ENCRYPTION_MASTER_KEY;
    const service = new TokenEncryptionService();

    expect(() => service.onModuleInit()).toThrow(
      /TOKEN_ENCRYPTION_MASTER_KEY/,
    );
  });

  it('32 byte olmayan bir master key reddedilmeli', () => {
    const tooShortKey = Buffer.from('kisa-key').toString('base64'); // 32 byte değil
    process.env.TOKEN_ENCRYPTION_MASTER_KEY = tooShortKey;
    const service = new TokenEncryptionService();

    expect(() => service.onModuleInit()).toThrow(/32 byte/);
  });
});