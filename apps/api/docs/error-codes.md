# Instascope Backend - Hata Kodları ve Yönetimi

Bu doküman, API genelinde kullanılan HTTP durum kodlarını, özel hata kodlarını ve hata filtrelerinin davranışlarını listeler.

## 1. Standart HTTP Hata Kodları

| Durum Kodu | Hata Türü | Açıklama |
| :--- | :--- | :--- |
| **400** | `Bad Request` | İstek gövdesi (DTO) doğrulama hatalarında (`ValidationPipe`) döner. Eksik veya yanlış formatlı alanlar için kullanılır. |
| **401** | `Unauthorized` | Geçerli bir JWT Bearer token sağlanmadığında veya token süresi dolduğunda döner. |
| **403** | `Forbidden` | Kullanıcının bu kaynağa veya işlem yetkisine sahip olmadığını belirtir. |
| **404** | `Not Found` | İstenen kaynak (Hesap, Post vb.) veritabanında bulunamadığında döner (`NotFoundException`). |
| **429** | `Too Many Requests` | Rate limit (Throttler) sınırları aşıldığında döner. |
| **500** | `Internal Server Error` | Öngörülemeyen sunucu hatalarında (`AllExceptionsFilter`) döner. |

## 2. Özel Hata Senaryoları ve Yanıt Yapısı

Projedeki `AllExceptionsFilter` ve `ThrottlerExceptionFilter` filtreleri tüm hataları standart bir JSON formatında döner:

```json
{
  "statusCode": 400,
  "timestamp": "2026-08-13T...",
  "path": "/api/v1/...",
  "message": "Hata açıklaması veya doğrulama mesajları dizisi"
}