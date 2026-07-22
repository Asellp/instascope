# ADR 0001: Veritabanı Erişim Katmanı İçin ORM Seçimi (Prisma vs TypeORM)

* **Durum:** Onaylandı (Accepted)
* **Tarih:** 2026-07-22
* **Karar Verenler:** Instascope Geliştirme Ekibi

---

## 1. Bağlam ve Problem Tanımı (Context)
Instascope projesinde NestJS tabanlı backend mimarisi ve PostgreSQL veritabanı kullanılmaktadır. Sistemde sosyal medya verileri (metrikler, gönderiler, yorumlar vb.) işleneceğinden, veritabanı erişim katmanında tip güvenliği (type-safety), veri tutarlılığı, hızlı geliştirme olanağı ve kolay migration yönetimi sağlayan bir ORM çözünüme ihtiyaç vardır.

Bu kararda, Node.js/TypeScript ekosistemindeki iki güçlü aday olan **Prisma** ve **TypeORM** değerlendirilmiştir.

---

## 2. Karar Seçenekleri (Options)

### Seçenek 1: TypeORM
NestJS ekosisteminde uzun yıllardır varsayılan olarak kullanılan Class tabanlı Decorator yaklaşımına sahip geleneksel ORM.

* **Artıları:**
  * NestJS ile entegrasyonu eskiye dayanır.
  * Active Record ve Data Mapper desenlerini destekler.
* **Eksileri:**
  * Tip güvenliği otomasyonu zayıftır (Type generation manuel veya hataya açıktır).
  * Migration süreçleri karmaşıklaşabilir ve sürüm uyuşmazlıklarına yol açabilir.
  * Complex query'lerde runtime hataları alma riski yüksektir.

### Seçenek 2: Prisma (Seçilen)
Deklaratif şema dili (`schema.prisma`) ve otomatik üretilen Type-safe Client yapısına sahip modern ORM.

* **Artıları:**
  * **Auto-generated Type Safety:** Şema değiştiğinde TypeScript tipleri otomatik güncellenir, derleme zamanında (compile-time) hata tespiti sağlar.
  * **Deklaratif Şema Yapısı:** Tüm modeller ve ilişkiler tek bir `schema.prisma` dosyasında net bir şekilde görünür.
  * **Prisma Migrate:** Migration süreçlerini otomatik ve güvenilir şekilde yönetir.
  * **Geliştirici Deneyimi (DX):** Prisma Studio ve güçlü IDE/VS Code eklentileri sayesinde veri görselleştirme ve sorgulama çok pratiktir.
* **Eksileri:**
  * NestJS ile entegrasyonda custom bir `PrismaService` yazılması gerekir (kolaylıkla çözülmüştür).

---

## 3. Karar (Decision)
Instascope projesinde veritabanı erişim katmanı için **Prisma ORM** seçilmiştir.

### Kararın Gerekçeleri:
1. **Tip Güvenliği ve Geliştirme Hızı:** Otomatik tip üretimi sayesinde backend tarafında çalışma zamanı (runtime) hataları minimize edilmiştir.
2. **Modellerin Bütünlüğü:** 9 adet ana tablonun ve ilişkilerinin tek bir `schema.prisma` dosyasından yönetilmesi ekip içi okunabilirliği artırmıştır.
3. **Prisma Studio Esnekliği:** Prototipleme ve veritabanı kontrolü süreçlerini belirgin şekilde hızlandırmaktadır.

---

## 4. Sonuçlar ve Etkiler (Consequences)
* **Pozitif:** Tip hataları derleme aşamasında yakalanacağı için daha sağlam (robust) bir API katmanı elde edilecektir.
* **Pozitif:** `prisma/schema.prisma` dosyamız projenin canlı veritabanı dokümantasyonu işlevini görecektir.
* **Aksiyon:** Proje dizininde `docs/adr/0001-orm-selection.md` dosyası oluşturulup bu karar kayıt altına alınmıştır.