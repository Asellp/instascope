# Token Şifreleme (Envelope Encryption) — S2.2

## Amaç

`TrackedAccount.accessTokenEnc` alanında saklanan Instagram OAuth token'larını,
veritabanı seviyesinde bir sızıntı (DB dump, backup çalınması, yetkisiz sorgu
erişimi vb.) olsa bile okunamaz hale getirmek.

## Mimari: Envelope Encryption

```
Plaintext Token
      │
      ▼
[AES-256-GCM, DEK ile şifrele] ──► Ciphertext + Auth Tag
      │
      ▼
   DEK (rastgele üretilmiş, tek kullanımlık)
      │
      ▼
[AES-256-GCM, Master Key ile sar] ──► Wrapped DEK + Auth Tag
      │
      ▼
Master Key (SADECE .env / gelecekte KMS'de — asla DB'de)
```

DB'ye yazılan tek şey: `{ wrappedDek, dekNonce, dekAuthTag, dataNonce, dataAuthTag, ciphertext }` — hepsi tek bir base64 blob halinde.

## Saldırı Senaryosu: "DB dump'ı ele geçiren saldırgan token'ları okuyamaz"

**Varsayım:** Bir saldırgan, PostgreSQL veritabanının tam bir kopyasını
(dump, backup, ya da SQL injection ile) ele geçirdi.

**Saldırganın elindekiler:**
- `tracked_accounts.access_token_enc` sütunundaki tüm şifreli blob'lar
- Şifreli blob'ların içindeki `wrappedDek` (sarılı DEK) — ama bu da şifreli

**Saldırganın ELİNDE OLMAYAN:**
- `TOKEN_ENCRYPTION_MASTER_KEY` — bu değer hiçbir zaman veritabanına
  yazılmaz, sadece uygulama sunucusunun ortam değişkenlerinde (`.env`,
  ileride bir KMS/Secrets Manager'da) durur. DB erişimi olan bir saldırgan,
  bu erişimle otomatik olarak sunucunun env değişkenlerine erişemez —
  bunlar ayrı güvenlik sınırlarıdır.

**Sonuç:** Saldırgan `wrappedDek`'i açamaz (master key yok) →
DEK'e ulaşamaz → asıl token'ı şifreleyen anahtarı elde edemez →
`ciphertext`'i çözemez. Token'lar, master key ayrıca ele geçirilmeden
**kriptografik olarak okunamaz** kalır.

Bu senaryo `token-encryption.service.spec.ts` içinde
`'DB dump senaryosu: master key olmadan şifreli veri asla çözülemez'`
testiyle otomatik olarak doğrulanıyor: gerçek servisin ürettiği blob,
farklı (saldırganın "tahmin ettiği") bir master key ile açılmaya
çalışıldığında `decrypt()` fırlatıyor.

## Nonce Yönetimi

AES-GCM'de aynı anahtar + nonce çiftinin tekrar kullanılması, şifrelemenin
güvenliğini tamamen çökertir (keystream tekrarı → XOR ile plaintext
kurtarılabilir hale gelir). Bunu önlemek için:

- Her şifreleme çağrısında (hem DEK sarma hem veri şifreleme katmanında)
  `crypto.randomBytes(12)` ile **taze, kriptografik olarak güvenli rastgele**
  bir 96-bit nonce üretilir.
- Nonce hiçbir zaman sayaç/tahmin edilebilir bir değerden türetilmez.
- 96-bit rastgele nonce'ta iki şifrelemenin aynı nonce'u alma olasılığı,
  doğum günü paradoksuna göre ancak ~2^48 (yaklaşık 281 trilyon) şifreleme
  sonrası %50'ye ulaşır — bu sistemin gerçekçi hacminin çok üzerinde,
  pratikte ihmal edilebilir bir risktir.

## Master Key Üretimi (Geliştirme Ortamı)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Çıkan değeri `.env`'e ekle:
```
TOKEN_ENCRYPTION_MASTER_KEY=<üretilen_base64_değer>
```

**Production için:** Bu değer asla git'e commit edilmemeli, asla `.env`
dosyası olarak sunucuya kopyalanmamalı — bir secrets manager (AWS
Secrets Manager, HashiCorp Vault, ya da en azından platformun kendi
environment variable şifreleme özelliği) üzerinden enjekte edilmeli.
Bu, ileride KMS entegrasyonuna geçişin ilk adımı olarak düşünülmeli.

## Sınırlamalar / İleride Yapılacaklar

- Şu an master key rotasyonu manuel — key değişirse eski verilerin
  yeniden şifrelenmesi gerekir (versiyon alanı `v: 1` bunun için hazır,
  ileride `v: 2` ile farklı bir unwrap mantığı eklenebilir).
- Gerçek bir KMS (AWS KMS, GCP KMS) entegrasyonu, master key'in kendisinin
  de asla düz metin olarak bir yerde durmamasını sağlar — şu anki `.env`
  yaklaşımı geliştirme/erken aşama için yeterli, production'a geçmeden
  önce bu adım tekrar değerlendirilmeli.