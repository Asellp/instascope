# İnstaScope - Tehdit Modellemesi (STRIDE)

Bu doküman, İnstaScope MVP mimarisindeki bileşenlerin ve veri akışlarının STRIDE metodolojisine göre tehdit analizini ve alınacak önlemleri içerir.

---

## 1. Mimarideki Bileşenler İçin STRIDE Tablosu

| Bileşen / Veri Akışı | Tehdit Tipi | Spesifik Tehdit Senaryosu | Alınacak Önlem / Azaltma (Mitigation) |
| :--- | :--- | :--- | :--- |
| **Web Paneli (Nuxt 3) ↔ Core API (NestJS)** | **Spoofing (Kimlik Taklidi)** | Saldırganın araya girerek sahte JWT üretmesi ve başka bir kullanıcının panelini ele geçirmesi. | JWT'lerin güçlü bir gizli anahtarla imzalanması, Access Token ömrünün 15 dk ile sınırlanması ve Refresh Token rotasyonu uygulanması. |
| **Collector Servisi (Python) ↔ Instagram API** | **Information Disclosure** | Instagram OAuth token'larının (Access Token) sızdırılması veya veritabanından düz metin olarak çalınması. | Token'ların veritabanında **AES-256-GCM** envelope encryption yöntemi ile şifreli olarak saklanması. |
| **AI Servisi (FastAPI) ↔ Core API** | **Tampering (Kurcalama)** | Saldırganın AI servisi iç uçlarına (`/internal/analyze`) doğrudan sahte analiz sonuçları post etmesi. | Servisler arası iletişimin **imzalı iç servis token'ları** ile korunması. |
| **Core API ↔ PostgreSQL 16** | **Elevation of Privilege** | Veritabanına sızan bir saldırganın veya kısıtlı bir DB kullanıcısının admin yetkilerine yükselmesi. | En az yetki prensibi. API'nin DB kullanıcısının yetkilerinin sadece gerekli tablolarla sınırlandırılması. |
| **İş Kuyruğu (Redis / BullMQ)** | **Denial of Service (DoS)** | Saldırganın API'ye aşırı hesap ekleme isteği atarak Redis iş kuyruğunu kilitlemesi ve sistemi çökertmesi. | IP ve hesap bazlı **Rate Limiting** koruması uygulanması. |
| **Collector (Scraping Modülü)** | **Repudiation (İnkar)** | Kazıcı (Scraper) modülün Instagram kurallarını ihlal edip yakalanması durumunda hangi hesabın işlem yaptığının izlenememesi. | Detaylı ve değiştirilemez **Audit Log** altyapısının kurulması. |

---

## 🚨 2. En Kritik 10 Tehdit ve Önlemleri

### 1. Instagram OAuth Token'larının Ele Geçirilmesi (Bilgi İfşası)
*   **Risk:** Token çalınırsa hedeflenen Business hesabının tüm yetkileri saldırgana geçer.
*   **Önlem:** Veritabanında asla yalın halde tutulmayacak. Master Key çevre değişkenlerinde tutularak **AES-256-GCM** ile şifrelenecek.

### 2. Sırların (Secrets) GitHub'a Sızması (Bilgi İfşası)
*   **Risk:** DB şifreleri veya API key'lerin açık repoya sızması.
*   **Önlem:** `gitleaks` pre-commit hook'ları ve CI Actions hattı kuruldu. `.env` dosyaları `.gitignore` ile engellendi.

### 3. AI Servisi Uçlarının Kötüye Kullanımı (Yetki Yükseltme)
*   **Risk:** Dışarıdan birinin AI analiz motorunu ücretsiz/yetkisiz sömürmesi.
*   **Önlem:** `/internal/analyze` ucu sadece backend'den gelen imzalı iç token'ları kabul edecek.

### 4. Brute-Force ve Login Ucuna Saldırılar (Hizmet Dışı Bırakma)
*   **Risk:** `/auth/login` ucuna binlerce istek atılarak NestJS veya DB'nin kilitlenmesi.
*   **Önlem:** BullMQ ve Redis tabanlı IP/Hesap bazlı rate-limiting entegrasyonu.

### 5. Yorum Verilerinin KVKK İhlali Yaratması (Bilgi İfşası)
*   **Risk:** Toplanan herkese açık yorumlardaki kullanıcı adlarının loglara veya DB dump'larına sızması.
*   **Önlem:** Kullanıcı adları **HMAC-SHA256** ile pseudonymize (takma adlı) hale getirilecek (`author_hash`).

### 6. XSS ve LocalStorage Üzerinden JWT Çalınması (Kimlik Taklidi)
*   **Risk:** Nuxt 3 frontend'inde bir açık bulunup kullanıcının oturum token'ının çalınması.
*   **Önlem:** JWT token'ları JavaScript'in erişemediği `httpOnly`, `Secure` ve `SameSite=Strict` cookie'lerinde saklanacak.

### 7. Veritabanı Enjeksiyonu / SQL Injection (Veri Kurcalama)
*   **Risk:** API uçlarından gelen kirli girdiyle veritabanı şemasına zarar verilmesi.
*   **Önlem:** Prisma/TypeORM üzerinden ORM kullanımı ve validasyon boru hatları ile sıkı girdi kontrolü.

### 8. Güvenlik Başıklığı Eksiklikleri (Bilgi İfşası)
*   **Risk:** Tarayıcı tabanlı saldırılarla API verilerinin manipüle edilmesi.
*   **Önlem:** NestJS tarafında `Helmet` ara yazılımı kullanılarak CORS politikalarının sertleştirilmesi.

### 9. Bağımlılıklardaki Güvenlik Açıkları (Yetki Yükseltme)
*   **Risk:** npm veya pip paketlerindeki eski sürümler üzerinden sisteme sızılması.
*   **Önlem:** CI/CD hattına `npm audit`, `pip-audit` ve Docker imajları için `trivy` taramaları eklenmesi.

### 10. Log Manipülasyonu (İnkar Edilebilirlik)
*   **Risk:** Saldırganın sisteme sızdıktan sonra kendi ayak izlerini log tablosundan silmesi.
*   **Önlem:** `audit_logs` tablosuna sadece `INSERT` (ekleme) yetkisi verilmesi, `UPDATE` ve `DELETE` işlemlerinin DB seviyesinde yasaklanması.