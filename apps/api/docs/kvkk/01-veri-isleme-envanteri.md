# Kişisel Veri İşleme Envanteri

**Proje:** Instascope  
**Kapsam:** 6669 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyumluluk süreci çerçevesinde sistemde işlenen verilerin envanteridir.

## 1. Veri Kategorileri ve İşleme Amaçları

| Veri Kategorisi | İşlenen Veri Türleri | Veri Kaynağı | İşleme Amaçları | Hukuki Sebebi |
| :--- | :--- | :--- | :--- | :--- |
| **Kimlik / Hesap Bilgileri** | Instagram Kullanıcı Adı (`igUsername`), Hesap ID (`igAccountId`) | Kullanıcı beyanı / Meta API | Takip edilen hesapların yönetimi ve analitiği | Bir sözleşmenin kurulması veya ifası |
| **Kimlik / Kimlik Doğrulama** | Şifrelenmiş Access Token (`accessTokenEnc`) | Meta API / Kullanıcı | API entegrasyonu ve otomatik veri toplama | Açık rıza / Sözleşme ifası |
| **Kullanıcı Üretimli İçerikler** | Gönderiler (`Posts`), Yorumlar (`Comments`), Altyazılar (`Captions`) | Instagram Platformu | Duygu analizi, istatistik ve performans raporlaması | Meşru menfaat / İlgili kişinin temel haklarına zarar vermemek kaydıyla |
| **Teknik Veriler** | Takipçi/Takip Edilen sayıları, Etkileşim oranları (`AccountMetric`) | Düzenli toplama (Cron) | Dashboard metrikleri ve büyüme analizi | Sözleşmenin ifası |

## 2. Veri Alıcı Grupları
* **Sistem Yöneticileri (Geliştirici Ekip):** Teknik bakım, hata ayıklama ve sistem güvenliği.
* **Yapay Zeka Servisleri:** Yorum duygu analizi ve metin işleme (Veriler anonimleştirilmiş veya metin bazlı işlenmektedir).