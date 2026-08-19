# Veri Saklama ve İmha Prosedürü (Staj Sonu İmha Planı Dahil)

**Proje:** Instascope  
**Yürürlük Tarihi:** Ağustos 2026  

## 1. Amaç
Bu prosedür, Instascope projesi kapsamında işlenen kişisel verilerin saklanma sürelerini ve staj dönemi bitiminde gerçekleştirilecek imha adımlarını belirler.

## 2. Saklama Süreleri
* **Akses ve Kimlik Bilgileri:** Sistem aktif olduğu sürece veya kullanıcı hesabı silinene kadar şifreli olarak saklanır.
* **Metrik ve Analiz Geçmişi:** İstatistiksel raporlama amacıyla en fazla 1 yıl süreyle saklanır, süresi dolan veriler periyodik olarak temizlenir.

## 3. Staj Sonu İmha Planı (Staj Bitiş Prosedürü)
Staj programının ve projenin tamamlanmasını takiben, test ve geliştirme ortamlarında bulunan tüm hassas veriler aşağıdaki plana göre imha edilecektir:

1. **Token ve Kimlik Temizliği:** Veritabanında yer alan tüm şifrelenmiş Instagram access token'ları (`accessTokenEnc`) kalıcı olarak silinecektir (`DELETE` / `TRUNCATE`).
2. **Test Veritabanı Sıfırlanması:** Yerel ve uzak sunucularda bulunan test hesapları, log kayıtları ve ilişkili veriler veritabanı seviyesinde tamamen temizlenecektir.
3. **Depolama Alanı Kontrolü:** Git geçmişinde veya loglarda hassas anahtar (secret/token) kalmadığı kontrol edilip depo kapatma/arşivleme işlemi gerçekleştirilecektir.