# Instascope - OWASP Top 10 Güvenlik ve Pentest Kontrol Listesi (Sprint 4)

Bu doküman, Instascope backend projesinin OWASP Top 10 (2021) risklerine karşı dayanıklılığını test etmek ve doğrulamak amacıyla bir pentest planı olarak hazırlanmıştır.

---

## A01: Broken Access Control (Bozulmuş Erişim Kontrolü)
* **Proje Bağlamı:** Kullanıcıların hesap verilerine, IDOR veya yetkisiz uç nokta (endpoint) erişimlerine karşı korunması.
* **Nasıl Test Edeceğim?:**
  1. Normal bir kullanıcı hesabıyla giriş yap ve bir başka kullanıcının ID'sine ait hassas veriyi (`/accounts/:id`) çekmeye çalış.
  2. Token veya Cookie olmadan korumalı rotalara istek atarak `401 Unauthorized` döndüğünü doğrula.
  3. Yetki seviyesi gerektiren (roller arası) işlemlerde Guard mekanizmalarının doğru çalışıp çalışmadığını Postman / curl ile test et.

## A02: Cryptographic Failures (Kriptografik Hatalar)
* **Proje Bağlamı:** Hassas verilerin (şifreler vb.) düz metin saklanmaması ve iletim sırasında şifrelenmesi.
* **Nasıl Test Edeceğim?:**
  1. Veritabanındaki (`Prisma / PostgreSQL`) kullanıcı kayıtlarını incele; şifrelerin hash'lenmiş (`bcrypt` vb.) olduğunu kontrol et.
  2. `SecurityHeaders` ve `curl -I` ile `Strict-Transport-Security` (HSTS) başlığının aktif olduğunu ve HTTPS yönlendirmelerini doğrula.

## A03: Injection (Enjeksiyon)
* **Proje Bağlamı:** SQL enjeksiyonları veya NoSQL/Command enjeksiyonlarına karşı ORM ve doğrulama mekanizmaları.
* **Nasıl Test Edeceğim?:**
  1. Girdi alanlarına (`query` parametreleri, body alanları) klasik SQL injection payload'ları (`' OR '1'='1`) gönder.
  2. Prisma ORM parametrik sorgular kullandığı için veritabanı seviyesinde sızıntı olmadığından ve `class-validator` / `ValidationPipe` (`whitelist: true`) sayesinde zararlı veya fazla alanların engellendiğinden emin ol.

## A04: Insecure Design (Güvensiz Tasarım)
* **Proje Bağlamı:** İş mantığı hataları, aşırı kaynak tüketimine yol açabilecek kontrolsüz akışlar.
* **Nasıl Test Edeceğim?:**
  1. Şifre sıfırlama veya login gibi kritik uç noktalarda iş akışı mantığını test et.
  2. Rate limiting (`Throttler`) mekanizmasının tetiklendiğini ve aşırı isteklerde `429 Too Many Requests` hatası döndüğünü doğrula.

## A05: Security Misconfiguration (Güvenlik Yapılandırma Hataları)
* **Proje Bağlamı:** Helmet başlıkları, CORS politikaları, hata ayıklama (debug) modlarının production'da açık kalması.
* **Nasıl Test Edeceğim?:**
  1. `securityheaders.com` üzerinden tünel aracılığıyla (Cloudflare Tunnel) tarama yaparak **A** skorunu teyit et.
  2. CORS ayarlarında sadece izin verilenorigin'lerin (`localhost`, belirli frontend adresleri) kabul edildiğini, bilinmeyen domain'lerden gelen isteklerin reddedildiğini test et.
  3. Swagger (`/docs`) arayüzünün üretim ortamında erişim kısıtlarını kontrol et.

## A06: Vulnerable and Outdated Components (Hatalı ve Güncel Olmayan Bileşenler)
* **Proje Bağlamı:** `package.json` içerisindeki bağımlılıkların güvenlik açıklarının bulunması.
* **Nasıl Test Edeceğim?:**
  1. Terminalde `pnpm audit` veya `snyk test` komutunu çalıştır.
  2. Tespit edilen kritik/yüksek seviyeli paket açıkları varsa sürümlerini güvenli versiyonlara güncelle.

## A07: Identification and Authentication Failures (Kimlik Doğrulama Hataları)
* **Proje Bağlamı:** Zayıf şifre politikaları, session/token yönetimi zaafiyetleri.
* **Nasıl Test Edeceğim?:**
  1. Brute-force saldırılarına karşı Throttler korumasının devreye girip girmediğini kontrol et.
  2. Çerez (`Cookie`) ayarlarında `HttpOnly`, `Secure` ve `SameSite` bayraklarının (flags) doğru yapılandırıldığını tarayıcı geliştirici araçlarından (Application -> Cookies) denetle.

## A08: Software and Data Integrity Failures (Yazılım ve Veri Bütünlüğü Hataları) güvensiz deserialization
* **Proje Bağlamı:** Güvenilmeyen kaynaklardan gelen verilerin doğrulanması.
* **Nasıl Test Edeceğim?:**
  1. `ValidationPipe` (`forbidNonWhitelisted: true`, `transform: true`) ayarlarının DTO dışındaki yabancı JSON property'lerini reddettiğini `POST` istekleriyle test et.

## A09: Security Logging and Monitoring Failures (Güvenlik Loglama ve İzleme Hataları)
* **Proje Bağlamı:** Sistemdeki hataların ve yetkisiz erişim denemelerinin loglanması.
* **Nasıl Test Edeceğim?:**
  1. Özel Exception Filter (`ThrottlerExceptionFilter`) ve hata yakalama mekanizmalarının log çıktılarını incele.
  2. Başarısız giriş denemelerinin veya kural ihlallerinin konsola/log dosyalarına düşüp düşmediğini gözlemle.

## A10: Server-Side Request Forgery (SSRF)
* **Proje Bağlamı:** Uygulamanın dış kaynaklardan veri çektiği modüllerin (örn. `scrape-data-source`) kötü niyetli URL'lere yönlendirilmesi.
* **Nasıl Test Edeceğim?:**
  1. Scraper veya dış veri kaynağı alanlarına dahili ağ IP'lerini (`http://localhost:3000/internal` veya `http://169.254.169.254/`) vererek istek atmasını engellediğini (URL validation) doğrula.