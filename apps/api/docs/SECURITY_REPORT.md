# İç Sızma Testi ve Güvenlik Kontrol Raporu

**Proje:** Instascope  
**Test Kapsamı:** OWASP Top 10 / API Güvenlik Kontrolleri  
**Tarih:** Ağustos 2026  

## 1. Yönetici Özeti (Executive Summary)
Bu rapor, Instascope projesinin arka uç ve API katmanına yönelik gerçekleştirilen iç sızma testi (internal penetration test) bulgularını, CVSS (Common Vulnerability Scoring System) tabanlı risk derecelendirmelerini ve geliştirici ekibi tarafından kapatılan güvenlik açıklarını özetler. Yapılan testler sonucunda tespit edilen tüm kritik ve yüksek seviyeli bulgular başarıyla giderilmiştir.

---

## 2. Bulgular ve Kapatılma Durumları

| Madde | Zafiyet Türü | OWASP Kategori | CVSS Skoru | Önem Derecesi | Durum | Açıklama ve Alınan Önlem |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S4.1.1** | **IDOR (Insecure Direct Object Reference)** | API1:2023 - Broken Object Level Authorization | **8.6 (High)** | **Kritik** | Kapatıldı ✅ | Normal bir kullanıcının URL üzerinden başka bir kullanıcıya ait `accountId` parametresini değiştirerek veri çekebildiği tespit edildi. `AccountsService` içerisine eklenen merkezi `findOne` yetki süzgeci ve mülkiyet (ownership) doğrulaması ile yetkisiz erişimler engellendi. |
| **S4.1.2** | **Yetki Atlama (Privilege Escalation)** | API5:2023 - Broken Function Level Authorization | **7.5 (High)** | **Kritik** | Kapatıldı ✅ | Standart kullanıcı rollerinin admin düzeyindeki silme/düzenleme uç noktalarına erişebileceği potansiyel risk görüldü. Tüm rotalara `JwtAuthGuard`, `RolesGuard` ve `@Roles(Role.ADMIN)` dekoratörleri entegre edilerek koruma sağlandı. |
| **S4.1.3** | **JWT / Token Güvenliği** | API2:2023 - Broken Authentication | **6.5 (Medium)** | **Orta** | Kapatıldı ✅ | Hassas veritabanı erişim token'larının açıkta saklanma riski giderildi. `TokenEncryptionService` kullanılarak hassas veriler AES standartlarında şifrelenmiş (`accessTokenEnc`) olarak saklanmaya başlandı. |
| **S4.1.4** | **Rate Limit Atlatma / Brute-Force** | API4:2023 - Unrestricted Resource Consumption | **5.3 (Medium)** | **Orta** | Kapatıldı ✅ | Kritik API isteklerine yönelik istek sınırı (Throttling) mekanizmaları devreye alınarak aşırı yüklenmeler ve spam isteklerin önüne geçildi. |
| **S4.1.5** | **Enjeksiyon Denemeleri (Injection)** | API8:2023 - Injection | **4.3 (Medium)** | **Düşük / Orta** | Kapatıldı ✅ | Prisma ORM parametrik sorgu altyapısı sayesinde SQL ve NoSQL enjeksiyon vektörleri veritabanı katmanında tamamen bloke edildi. |

---

## 3. Sonuç
Proje üzerinde gerçekleştirilen iç sızma testi simülasyonları ve OWASP denetimleri başarıyla tamamlanmıştır. Tespit edilen **kritik ve yüksek dereceli tüm zafiyetler (IDOR ve Yetki Atlama dahil) yazılım ekibi tarafından kapatılmış** olup, sistem güncel güvenlik standartlarına uygun hale getirilmiştir.