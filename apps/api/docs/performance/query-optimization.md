# B3.4 — Sorgu Optimizasyonu

**Sprint:** Sprint 3 (Hafta 5-6) — Analitik Derinlik
**Tarih:** 2026-08-06
**İlgili görev:** B3.4 — Yavaş sorguları EXPLAIN ANALYZE ile incele; gerekli index'leri ekle; N+1 sorgularını temizle.

## Özet

B3.1–B3.3'te yazılan analitik uçlarının (`overview`, `posts`, `hashtags`, `best-times`) veritabanı katmanı gözden geçirildi. İki composite index eklendi, bir redundant index kaldırıldı, ve `posts` ucundaki iki fonksiyonel hata (filtre ve sıralama) düzeltildi.

---

## 1. Eklenen Index'ler

### 1.1 `posts(account_id, posted_at)`

**Gerekçe:** `getAccountPosts` (B3.2) ve `getOverview` (B3.1) sorgularının her ikisi de `account_id` ile filtreleyip `posted_at` ile sıralıyor/filtreliyor. Önceden sadece `account_id` üzerinde tekil bir index vardı; `posted_at` sıralaması index'siz, ekstra bir sort adımı gerektiriyordu.

```prisma
model Post {
  ...
  @@index([accountId])
  @@index([accountId, postedAt])
}
```

**Doğrulama (`EXPLAIN ANALYZE`, `enable_seqscan=off` ile zorlanarak):**

```
Limit (cost=0.13..12.18 rows=3 width=148) (actual time=0.055..0.058 rows=3.00 loops=1)
  -> Index Scan Backward using posts_account_id_posted_at_idx on posts
       Index Cond: (account_id = '...')
```

Not: local/dev veri setinde hesap başına post sayısı çok düşük (3 satır) olduğu için planlayıcı normal koşullarda `Seq Scan`'i tercih ediyor — bu, küçük tablolarda beklenen ve doğru bir davranış (index okumak, tam tabloyu bir kez taramaktan daha pahalı). `enable_seqscan=off` ile index'in fiziksel olarak var ve `ORDER BY postedAt DESC` ile uyumlu (`Index Scan Backward`, ekstra sort adımı gerekmiyor) olduğu doğrulandı. Index'in gerçek etkisi, post sayısı production ölçeğine ulaştıkça (yüzler/binler) planlayıcı tarafından otomatik olarak devreye girecektir.

### 1.2 `analysis_results(subject_id, kind, created_at)`

**Gerekçe:** `getHashtagAnalysis` ve `getBestTimes` (B3.3), `findFirst({ where: { subjectId, kind }, orderBy: { createdAt: 'desc' } })` deseniyle sorgu atıyor. Mevcut `(subject_type, subject_id)` composite index'i leading kolonu (`subject_type`) filtrelenmediği için bu sorguda etkin kullanılamıyordu.

```prisma
model AnalysisResult {
  ...
  @@index([subjectType, subjectId])
  @@index([subjectId, kind, createdAt])
}
```

**Doğrulama:**

```
Limit (cost=0.14..8.16 rows=1 width=338) (actual time=0.016..0.017 rows=1.00 loops=1)
  -> Index Scan Backward using analysis_results_subject_id_kind_created_at_idx on analysis_results
       Index Cond: ((subject_id = '...') AND (kind = 'topics'::text))
```

Index doğru şekilde `subject_id` + `kind` filtresini karşılıyor ve `created_at DESC` sıralamasını (backward scan ile) ekstra sort adımı olmadan sağlıyor.

## 2. Kaldırılan Index

### `tracked_accounts_ig_username_idx`

`igUsername` alanı zaten `@unique` olarak tanımlıydı, bu da Postgres'te kendi index'ini otomatik oluşturur. Ayrıca eklenmiş `@@index([igUsername])` aynı kolonda ikinci, gereksiz bir index'ti — disk alanı ve her INSERT/UPDATE'te ekstra bakım maliyeti getiriyordu, hiçbir sorgu avantajı sağlamıyordu. Migration ile kaldırıldı.

## 3. Bulunan ve Düzeltilen Bug'lar

### 3.1 `contentType` filtresi şemayla uyuşmuyordu

`accounts.service.ts` → `getAccountPosts`:

```ts
// ÖNCE (hatalı — Post modelinde "contentType" alanı yok, alan adı "type")
...(contentType ? { contentType } : {})

// SONRA
...(contentType ? { type: contentType } : {})
```

**Doğrulama (gerçek veriyle):**
- `?contentType=IMAGE` → 3/3 post döndü (hesaptaki tüm postlar IMAGE tipinde)
- `?contentType=VIDEO` → `data: []` döndü (filtre DB seviyesinde doğru çalışıyor)

### 3.2 `sortBy=engagement` aslında `postedAt`'e göre sıralıyordu

```ts
// ÖNCE (hatalı — iki dal da aynı alanı kullanıyordu)
if (sortBy === 'engagement') {
  orderBy = { postedAt: sortOrder };
} else {
  orderBy = { postedAt: sortOrder };
}

// SONRA
if (sortBy === 'engagement') {
  orderBy = { postMetrics: { engagementRate: sortOrder } };
} else {
  orderBy = { postedAt: sortOrder };
}
```

**Doğrulama (gerçek veriyle, `sortOrder=desc`):**

| post | engagementRate |
|---|---|
| 4279ccfc... | 10 |
| 90442750... | 6 |
| d66e9d90... | 5 |

Azalan sırada doğru şekilde geldi.

**Bilinen sınırlama:** `postMetrics` ilişkisi nullable (`PostMetric?`). `engagementRate` değeri olmayan (metric kaydı hiç oluşmamış) postların relation-sort'ta nereye düşeceği ayrıca test edilmedi — Postgres'te NULL değerler varsayılan olarak `DESC` sıralamada başa, `ASC`'de sona düşer. İleride bu davranış üründe önemli olursa `NULLS LAST` gibi bir ayar eklenmesi değerlendirilebilir.

## 4. Migration Süreciyle İlgili Not

Migration'ı çalıştırırken DB ile migration history arasında drift tespit edildi (`deleted_at` kolonu migration dosyasında tanımlıydı ama DB'de yoktu — muhtemelen önceki bir migration'ın unique index adımında hata alıp yarım kalmasından kaynaklandı). Reset yapılmadan, gerçek veriler korunarak:
- Eksik `deleted_at` kolonu ve `ig_username` unique index'i elle DB'ye uygulanıp migration history ile senkronize edildi.
- Ardından `schema.prisma`'da `deletedAt` alanı tanımlı olmadığı için, yeni migration bu kolonu düşürdü (kullanılmayan alan, bilinçli karar).

## 5. Yapılmadı / Kapsam Dışı Bırakıldı

- `getSentimentBreakdown` (B3.3), hesaba ait tüm post ve yorumları sayfalama olmadan tek seferde çekiyor. N+1 değil ama büyük hesaplarda ağır olabilir. Bu görev kapsamında ölçülmedi; ileride ayrı bir madde olarak değerlendirilmeli.
- Redis cache (B3.5) bu optimizasyonların üzerine ayrı bir görev olarak eklenecek.