# Güvenlik Raporu (`docs/security-report.md`)

## 1. Tehdit Modeli (Threat Model)
Instascope projesinin mimarisinde öngörülen ana tehdit vektörleri ve saldırı yüzeyleri:
* **Yetkisiz Veri Erişimi (IDOR - Insecure Direct Object Reference):** Kullanıcıların başka hesaplara ait sosyal medya metriklerini, postlarını veya analiz verilerini URL üzerinden ID değiştirerek görüntülemesi.
* **Hassas Veri Sızıntısı (Token Güvenliği):** Meta/Instagram erişim tokenlarının (Access Tokens) veritabanında düz metin (plaintext) olarak saklanması ve sızdırılması durumunda hesapların ele geçirilmesi.
* **Servisler Arası Yetkisiz İstekler (SSRF / Internal API Abuse):** Backend ile Scraper/AI mikroservisleri arasındaki iç iletişim (internal endpoints) uç noktalarının dışarıdan doğrudan tetiklenebilmesi.
* **Bot / Scraping Engelleri ve Rate Limiting:** Sık istek atılması nedeniyle hedef platformlar tarafından IP/hesap banlanması veya sistemin çökertilmesi (DoS).

---

## 2. Alınan Önlemler (Mitigations Implemented)
Yukarıdaki tehditlere karşı mimari düzeyde alınan önlemler:
* **IDOR Koruması (`AccountsService`):** `findOne(id, userId, userRole)` katmanı ile her istekte kullanıcının rolde yetkili (Admin) veya kaynağın sahibi olup olmadığı (`account.userId === userId`) kontrol edilir; yetkisiz erişimlerde `ForbiddenException` fırlatılır.
* **Token Şifreleme (`TokenEncryptionService`):** Kullanıcıların Meta erişim tokenları veritabanına kaydedilmeden önce güçlü şifreleme algoritmalarıyla (`encryption`) şifrelenir, sadece anlık kullanımda çözülür.
* **Internal Token Güvenliği:** Backend'den AI veya Scraper mikroservislerine yapılan dahili çağrılarda `x-internal-token` (veya `INTERNAL_SECRET_TOKEN`) header zorunluluğu getirilmiştir. Dışarıdan gelen yetkisiz HTTP istekleri reddedilir.
* **Güvenli Zaman Aşımı (AbortController):** Scraper ve AI servis çağrılarında 3 dakikalık sıkı timeout mekanizmaları kurularak kaynak sızıntıları ve thread bloklanmaları engellenmiştir.

---

## 3. Pentest (Güvenlik Testi) Bulguları
Simüle edilen sızma testleri ve sonuçları:
* **Bulgu 1 (IDOR Testi):** Normal bir kullanıcı `GET /accounts/{other_account_id}` isteğinde bulunduğunda sistem `403 Forbidden` döndürmüştür. **(Çözüldü)**
* **Bulgu 2 (Token Sızması Testi):** Veritabanı (Prisma) kayıtları doğrudan incelendiğinde `accessTokenEnc` alanının şifreli (ciphertext) olduğu, düz metin veri sızıntısı riskinin bulunmadığı doğrulanmıştır. **(Çözüldü)**
* **Bulgu 3 (Dahili Servis Erişimi):** Scraper mikroservisinin `/internal/` uç noktalarına `x-internal-token` header'ı olmadan yapılan curl istekleri `401/403` ile engellenmiştir. **(Çözüldü)**

---

## 4. Kalan Riskler ve İyileştirme Önerileri (Residual Risks)
* **Hedef Platform (Instagram) Sınırlamaları:** Scraper tabanlı veri çekme işlemlerinde Instagram'ın IP bloklama veya rate-limit politikaları nedeniyle geçici veri toplama aksaklıkları yaşanabilir. 
  * *İyileştirme Önerisi:* Proxy havuzu (Rotating Proxy) entegrasyonu ilerleyen aşamalarda devreye alınmalıdır.
* **Token Süre Aşımı (Token Expiration):** Meta kullanıcı tokenlarının süresi dolduğunda arka plandaki BullMQ worker'ları hata alabilir. 
  * *İyileştirme Önerisi:* Kullanıcı arayüzünde (Frontend) token yenileme (re-auth) uyarı mekanizması güçlendirilmelidir.