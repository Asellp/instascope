# Değerlendirme Raporu v1 (Mock Veri)

**Eval set:** data/eval_v1.jsonl — 400 satır, kılavuza göre etiketlendi
**Veri kaynağı:** Mock/sentetik (gerçek Instagram verisi henüz yok — bkz. A2.5).
Gerçek veri akışa girince bu rapor **v2** olarak güncellenecek.

---

## A2.3 — Duygu Analizi (Sentiment)

**Model:** cardiffnlp/twitter-xlm-roberta-base-sentiment
**Değerlendirilen:** 360 satır (spam hariç)

**Macro F1: 0.7636** — DoD hedefi (≥ 0.75) **geçildi ✅**

| Sınıf | Precision | Recall | F1 | Adet |
|---|---|---|---|---|
| positive | 0.87 | 0.77 | 0.82 | 162 |
| negative | 0.89 | 0.66 | 0.76 | 132 |
| neutral | 0.56 | 1.00 | 0.72 | 66 |

Genel doğruluk: 0.77

**Gözlem:** Model emin olamadığında "neutral"e kayma eğiliminde (neutral
recall 1.00 ama precision 0.56) — pozitif/negatif tarafında precision
yüksek, recall daha düşük. DoD hedefi geçildiği için zorunlu değil ama
v2 için iyileştirme notu olarak bırakıldı.

---

## A2.4 — Spam Filtresi (Kural Tabanlı v0)

**Değerlendirilen:** 400 satırın tamamı

**Precision: 1.00** — DoD hedefi (≥ 0.90) **geçildi ✅**

| Metrik | Değer |
|---|---|
| Precision | 1.00 |
| Recall | 0.95 |
| F1 | 0.9744 |
| False Positive | 0 |

---

## Genel durum

İki görev de mock veri üzerinde DoD hedeflerini geçti. Gerçek veri
(A2.5 scraping + Backend'in Graph API entegrasyonu) sisteme girdiğinde
her iki değerlendirme de gerçek veri karışık/tam haliyle tekrarlanıp
bu rapor v2 olarak güncellenmeli.
