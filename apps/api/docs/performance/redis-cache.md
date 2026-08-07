# B3.5 — Redis Cache

**Sprint:** Sprint 3 (Hafta 5-6) — Analitik Derinlik
**Tarih:** 2026-08-06
**İlgili görev:** B3.5 — Overview gibi pahalı uçlara TTL'li cache + hesap verisi güncellenince invalidation. DoD: cache hit oranı loglanıyor.

## Özet

`GET /accounts/:id/overview` ucuna Redis tabanlı cache-aside pattern eklendi. Cache anahtarları range'e göre TTL ile süreli, hesap için yeni veri toplandığında (collector job'ı tamamlandığında) otomatik geçersiz kılınıyor, ve her cache erişiminde hit/miss oranı loglanıyor.

---

## 1. Mimari

### 1.1 Yeni modüller

- **`src/cache/redis.module.ts`** — `ioredis` client'ını `REDIS_CLIENT` token'ı ile provider olarak sağlayan, `@Global()` işaretli modül.
- **`src/cache/cache.service.ts`** — `get`/`set`/`invalidatePattern` metodlarını ve hit/miss sayaçlarını içeren servis.
- **`src/cache/cache.module.ts`** — `RedisModule`'ü import edip `CacheService`'i export eden, `@Global()` işaretli sarmalayıcı modül.

`CacheModule`'ün global yapılması bilinçli bir tasarım kararı: `CacheService`'e hem `AccountsService`'te (okuma/yazma) hem `CollectorProcessor`'da (invalidation) ihtiyaç duyuluyor. Global olmadan her modülde ayrı ayrı provider tanımlamak gerekirdi — bu hem tekrar hem de "Nest can't resolve dependencies" tipi hatalara açık bir yapı olurdu (nitekim geliştirme sırasında bu hata ile karşılaşıldı, `CacheModule` global yapılarak çözüldü).

### 1.2 Redis servisi

`docker-compose.yml`'e eklendi:

```yaml
services:
  redis:
    image: redis:alpine
    container_name: instascope_redis
    ports:
      - "6379:6379"
    restart: always
```

## 2. Cache-Aside Pattern — `getOverview`

`accounts.service.ts` içinde `getOverview` fonksiyonu şu akışla güncellendi:

```ts
const RANGE_TO_TTL_SECONDS: Record<OverviewRange, number> = {
  '7d': 60,     // 1 dakika
  '30d': 300,   // 5 dakika
  '90d': 900,   // 15 dakika
};
```

```ts
async getOverview(accountId: string, range: OverviewRange = '30d') {
  await this.findOne(accountId);

  const cacheKey = `overview:${accountId}:${range}`;
  const cached = await this.cacheService.get<AccountOverviewResponse>(cacheKey);
  if (cached) return cached;

  // ... mevcut DB sorgu mantığı değişmedi ...

  await this.cacheService.set(cacheKey, result, RANGE_TO_TTL_SECONDS[range]);
  return result;
}
```

**Cache key formatı:** `overview:<accountId>:<range>` — her hesap ve her range kombinasyonu (7d/30d/90d) için ayrı bir cache girdisi.

**TTL'in range'e göre farklılaştırılma gerekçesi:** Kısa aralıklar (7d) daha güncel kalması beklenen veriler olduğu için kısa TTL; uzun aralıklar (90d) istatistiksel olarak daha stabil olduğu için daha uzun TTL güvenle kullanılabilir.

### 2.1 Doğrulama — TTL yaşam döngüsü (redis-cli ile canlı gözlem)

```
127.0.0.1:6379> TTL "overview:b7351c3c-...:30d"
(integer) 292
127.0.0.1:6379> TTL "overview:b7351c3c-...:30d"
(integer) 289
127.0.0.1:6379> TTL "overview:b7351c3c-...:30d"
(integer) 283
```

Süre doğal olarak azalıyor — key gerçekten Redis'te TTL ile yaşıyor.

```
127.0.0.1:6379> TTL "overview:b7351c3c-...:30d"
(integer) -2          ← süre dolduktan sonra key silindi
127.0.0.1:6379> KEYS "*overview*"
1) "overview:b7351c3c-...:30d"    ← yeni istekle tekrar oluştu, TTL yenilendi
```

Bu, cache-aside döngüsünün (miss → DB'den hesapla → cache'e yaz → TTL ile süreli sakla → süre dolunca tekrar miss) uçtan uca çalıştığını kanıtlıyor.

## 3. Invalidation — Hesap Verisi Güncellenince

`CollectorProcessor.process()` içinde, `collectionJob` başarıyla `COMPLETED` olarak işaretlendikten hemen sonra, AI servisleri tetiklenmeden önce eklendi:

```ts
if (totalItemsCollected > 0) {
  await this.cacheService.invalidatePattern(`overview:${account.id}:*`);
  this.logger.log(`Cache invalidated: overview:${account.id}:*`);
}
```

`invalidatePattern`, `CacheService` içinde `redis.keys(pattern)` ile eşleşen tüm key'leri (o hesabın 7d/30d/90d cache'lerinin hepsini) bulup siler.

**Neden bu konumda:**
- Post/PostMetric DB'ye yazıldıktan **sonra** yapılıyor — sıralama mantıksal olarak doğru (önce veri güncellenir, sonra bağımlı cache temizlenir).
- AI servislerinin (`analyze-account`, `sentiment`) tetiklenmesinden **önce** yapılıyor — onlar `analysis_results` tablosuna yazıyor, `overview` cache'i ile ilgisi yok, gecikmeye gerek yok.
- `catch` bloğunda (hata durumunda) çağrılmıyor — hata varsa yeni veri muhtemelen tutarsız/yarım yazılmıştır, mevcut cache'i korumak DB'deki yarım veriyi kullanıcıya göstermekten daha güvenli.

### 3.1 Doğrulama — gerçek job ile invalidation

Bir collect job'ı elle tetiklenip loglar izlendi:

```
[CollectorProcessor] Hesap işleniyor: instascope4 (ID: b7351c3c-...)
[CollectorProcessor] Cache invalidated: overview:b7351c3c-c464-4ed8-a6e8-594619112a26:*
[CollectorProcessor] [BullMQ] 'collect' işi başarıyla tamamlandı.

[Cache] hit rate: 100.0% (1/1)
[Cache HIT] Key: overview:1c361968-...          ← farklı hesap, etkilenmedi (doğru)
[Cache] hit rate: 50.0% (1/2)
[Cache MISS] Key: overview:b7351c3c-...          ← invalidate edilen hesap, artık MISS
```

Bu log zinciri iki şeyi kanıtlıyor:
1. Job tamamlandıktan hemen sonra `b7351c3c-...` hesabına ait overview isteği **MISS** döndü — önceden cache'te olan veri gerçekten silindi.
2. `invalidatePattern` doğru scope'ta çalışıyor — aynı anda başka bir hesabın (`1c361968-...`) cache'i **HIT** olarak kaldı, yani invalidation sadece ilgili hesabı etkiliyor, diğer hesapların cache'ini gereksiz yere silmiyor.

## 4. Cache Hit Oranı Loglaması

`CacheService.get()` her çağrıldığında hit/miss sayaçları güncellenip anlık oran loglanıyor:

```ts
private logHitRate() {
  const total = this.hits + this.misses;
  const rate = ((this.hits / total) * 100).toFixed(1);
  console.log(`[Cache] hit rate: ${rate}% (${this.hits}/${total})`);
}
```

**Örnek canlı log çıktısı:**

```
[Cache] hit rate: 0.0% (0/1)
[Cache MISS] Key: overview:1c361968-...:30d
[Cache] hit rate: 0.0% (0/2)
[Cache MISS] Key: overview:b7351c3c-...:30d
[Cache] hit rate: 33.3% (1/3)
[Cache HIT] Key: overview:1c361968-...:30d
[Cache] hit rate: 50.0% (2/4)
[Cache HIT] Key: overview:b7351c3c-...:30d
...
[Cache] hit rate: 77.8% (7/9)
```

**Bilinen sınırlama:** Sayaçlar process-in-memory tutuluyor, uygulama restart edildiğinde sıfırlanıyor. DoD "loglanıyor" şartını karşılıyor; process restart'larına dayanıklı, kalıcı bir metrik isteniyorsa Redis'te ayrı bir `INCR cache:hits` / `INCR cache:misses` sayaç anahtarı ile ilerletilebilir — bu görev kapsamında gerekli görülmedi.

## 5. Karşılaşılan ve Çözülen Sorunlar

- **DI hatası (`Nest can't resolve dependencies of CacheService`):** `CacheService`, `AccountsModule`'ün `providers` listesine eklenmişti ama kendi bağımlılığı olan `REDIS_CLIENT`'ın erişilebilir olduğu bir modül import edilmemişti. Çözüm: `CacheModule` oluşturulup `@Global()` yapıldı, `app.module.ts`'e bir kez eklendi; artık her modülde ayrı ayrı tanımlamaya gerek yok.
- **`PostMetricOrderByRelationAggregateInput` tip hatası (B3.4'ten kalıntı, ilgisiz):** VS Code TS Language Server'ın eski client tipini cache'lemesinden kaynaklandı, `TypeScript: Restart TS Server` ile çözüldü.

## 6. Yapılmadı / Kapsam Dışı Bırakıldı

- Cache hit oranı şu an sadece konsola loglanıyor; bir monitoring/metrics servisine (Prometheus vb.) aktarılmadı — DoD bunu talep etmiyor.
- `posts`, `hashtags`, `best-times` uçlarına cache eklenmedi — DoD sadece `overview` ucunu ("Overview gibi pahalı uçlara") hedefliyor. İleride benzer pattern diğer uçlara da uygulanabilir.
- Zamanlanmış (repeat) collect job'ları şu an `sourceType: API` filtresiyle çalıştığı için mevcut test hesapları (`MOCK`/`AI` tipinde) otomatik job'larla toplanmıyor — invalidation gerçek otomatik akışta değil, elle tetiklenen bir job ile doğrulandı. Bu B3.5'in kapsamı dışında, ayrı bir konu olarak not düşülüyor.