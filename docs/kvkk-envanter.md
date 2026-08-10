Kişisel Veri İşleme Envanteri

1. Panel Kullanıcı Verisi
   - İşlenen veri: E-posta adresi, parola özetleri (`password_hash`)
   - Amaç: Kullanıcı hesabı oluşturma, kimlik doğrulama ve role tabanlı yetkilendirme
   - Saklandığı yer: PostgreSQL / `users` tablosu
   - Saklama süresi: Kullanıcı hesabı aktif olduğu sürece; hesap silindiğinde derhal imha
   - Pseudonymization durumu: Gerekmiyor. Parolalar `argon2id` ile tek yönlü özetlenmektedir

2. Müşteri Bağlantı Verisi
   - İşlenen veri: Instagram API Erişim Belirteçleri (`access_token_enc`)
   - Amaç: Entegrasyon sağlanan Business/Creator hesaplarının verilerini periyodik toplamak
   - Saklandığı yer: PostgreSQL / `tracked_accounts` tablosu
   - Saklama süresi: Hesap takibi iptal edilene kadar
   - Pseudonymization durumu: Gerekmiyor. Veritabanında `AES-256-GCM` ile şifreli tutulmaktadır

3. Sosyal Medya Etkileşim Verisi
   - İşlenen veri: Instagram Yorum Sahibi Kimliği (`author_hash`)
   - Amaç: Yorumlar üzerinden profil bazlı duygu, spam ve bot tespiti yapmak
   - Saklandığı yer: PostgreSQL / `comments` tablosu
   - Saklama süresi: Staj / Proje süresi sonuna kadar; proje bitiminde veri imha politikası uygulanır
   - Pseudonymization durumu: Zorunlu. Ham kullanıcı adları `HMAC-SHA256` ile maskelenerek saklanır

4. Sosyal Medya İçerik Verisi
   - İşlenen veri: Herkese açık yorum metinleri (`text`)
   - Amaç: Türkçe NLP modelleri ile duygu analizi ve konu modellemesi yapmak
   - Saklandığı yer: PostgreSQL / `comments` tablosu
   - Saklama süresi: Staj / Proje süresi sonuna kadar; proje bitiminde veri imha politikası uygulanır
   - Pseudonymization durumu: Gerekmiyor. Metin içeriğinde KVKK ihlali olmaması için isim/soyisim veri minimizasyonuna tabi tutulur

5. Güvenlik ve İşlem Logları
   - İşlenen veri: Kullanıcı IP adresi, gerçekleştirilen eylemler
   - Amaç: Sistem güvenliğinin sağlanması, siber saldırıların tespiti ve denetim izi oluşturulması
   - Saklandığı yer: PostgreSQL / `audit_logs` tablosu
   - Saklama süresi: Güvenlik politikaları gereği 2 yıl
   - Pseudonymization durumu: Gerekmiyor. Sadece `INSERT` yetkisi tanımlı, dışarı kapalı log tablosu

Pseudonymization Kuralları

1. `comments.author_hash` alanı
   - Instagram'dan toplanan ham kullanıcı adları (username) veritabanına asla yalın halde yazılmayacaktır
   - AI ve Backend servisleri, ham kullanıcı adını sistem çevresel değişkenlerinde saklanan gizli bir anahtarla `HMAC-SHA256` fonksiyonundan geçirerek `author_hash` değerini üretecektir

2. Log güvenliği
   - Backend (NestJS) ve AI (FastAPI) servislerinin uygulama içi loglarında (Console/Pino) ham kullanıcı adlarının veya profil detaylarının sızmadığı stajyerler tarafından manuel/kod incelemesi ile kontrol edilecektir

3. Veri imha politikası
   - Staj bitiminde toplanan tüm ham Instagram verileri (`posts`, `comments`, `post_metrics`) veritabanından kalıcı olarak temizlenecektir
