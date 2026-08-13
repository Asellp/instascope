# Etiketleme Kılavuzu — Duygu Analizi (Pozitif / Negatif / Nötr)

**İlgili madde:** A1.5
**Amaç:** Yorumları tutarlı ve tekrarlanabilir şekilde pozitif / negatif / nötr olarak etiketlemek için ekip içi ortak standart oluşturmak.

---

## 1. Temel Tanımlar

### 🟢 Pozitif
Yorum, ürün/hizmet/konu hakkında **açık veya örtük olumlu bir tutum** ifade ediyorsa.
- Övgü, memnuniyet, tavsiye, teşekkür içeren yorumlar
- Olumlu emoji ile desteklenen ifadeler (😍, 👍, ❤️)

**Örnekler:**
- "Kargo çok hızlı geldi, teşekkürler!" → Pozitif
- "Kesinlikle tavsiye ederim 🙌" → Pozitif

### 🔴 Negatif
Yorum, **açık veya örtük olumsuz bir tutum, şikayet, hayal kırıklığı veya eleştiri** içeriyorsa.
- Şikayet, memnuniyetsizlik, uyarı, olumsuz karşılaştırma
- Olumsuz emoji ile desteklenen ifadeler (😡, 👎, 😞)

**Örnekler:**
- "Ürün kırık geldi, çok kötü bir deneyimdi." → Negatif
- "Bir daha asla almam." → Negatif

### ⚪ Nötr
Yorum **duygu belirtmiyor**, sadece bilgi veriyor, açıklama istiyor ya da tarafsız bir gözlem içeriyorsa.
- Saf bilgi talebi, tarafsız açıklama, duygu içermeyen yorum

**Örnekler:**
- "Bu ürün hangi renklerde var?" → Nötr
- "Siparişim dün kargoya verildi." → Nötr

---

## 2. Özel Durumlar (Edge Cases)

Bu kılavuzun en kritik kısmı — çünkü anlaşmazlıkların çoğu buradan çıkar.

### 2.1 Alaycı / Sarkastik Yorumlar
Kural: **Yüzeydeki kelimelere değil, yorumun gerçek niyetine göre etiketle.**
- Sarkastik övgü (aslında eleştiri niteliğinde) → **Negatif**
- Emin olunamıyorsa (bağlam yetersizse) → **Nötr** olarak işaretle 

**Örnek (veri setinden):**
- "Bravo ya yine şaşırtmadınız. #mutfak" → Negatif (sarkazm belirgin)
- "Müşteri ilişkileri mükemmel (cevap vermiyorlar) 👏" → Negatif (parantez içi açıklama sarkazmı ele veriyor)
- "Aynen çok samimi içerik kesinlikle sponsorlu değil 😂" → Negatif
- "Çok profesyonelsiniz gerçekten..." (üç nokta + bağlamsız övgü) → Dikkat: Bağlam yoksa tek başına ayırt etmek zor olabilir; benzer yorumlar bu hesapta/postta tekrarlanıyorsa (📌 ipucu: "😂" veya "..." ile biten abartılı övgüler genelde sarkastik) → Negatif; hâlâ emin değilsen → Nötr + tartışmalı listeye ekle

**İpucu:** Bu veri setinde sarkastik yorumların çoğu şu paternlerden birini taşıyor: parantez içinde çelişkili açıklama `(cevap vermiyorlar)`, ünlem/nokta ile vurgulanan abartı `(!)`, `😂` veya `🤔` ile biten "çok profesyonelsiniz gerçekten..." kalıbı. Bu paternleri fark edince önce sarkazm ihtimalini değerlendir.

### 2.2 Emoji-Only Yorumlar
Kural: Sadece emoji içeren yorumlar, emojinin **genel kabul gören anlamına** göre etiketlenir.
- Tek/çoklu pozitif emoji (😍🔥👏❤️) → Pozitif
- Tek/çoklu negatif emoji (😡👎💔) → Negatif
- Duygu belirtmeyen/karışık emoji (🤔😐) veya yorumlanması belirsiz emoji → Nötr

**Örnek (veri setinden):**
- "❤️" → Pozitif
- "🔥🔥🔥" → Pozitif
- "🙌🏼🙌🏼 #ootd @bilgendumanli" → Pozitif (mention/hashtag var ama asıl içerik emoji; mention/hashtag etiketi etkilemez)
- "👎 #gezi" → Negatif
- "🤮👎 @metinkaya39" → Negatif
- "🥹❤️ #gezi 👎" → **Çelişkili emoji kombinasyonu** (hem pozitif hem negatif emoji bir arada) → Nötr olarak işaretle, tartışmalı listeye ekle

**Not:** Mention (@kullanıcı) veya hashtag (#etiket) içeren yorumlar da "emoji-only" sayılır, çünkü asıl duygu emojiden geliyor — mention/hashtag'i yok say, sadece emojiye odaklan.

### 2.3 Soru Soran Yorumlar
Kural: Bir yorum **sadece soru içeriyorsa ve duygu belirtmiyorsa** → Nötr.
Ama soru + duygu birlikteyse, duygu baskın gelir.

**Örnek (veri setinden):**
- "Bu elbisenin nereden aldınız?" → Nötr (saf bilgi talebi)
- "videodaki yemeğin adını bilen var mı?" → Nötr
- "Markası ne acaba? #vlog 😂" → Nötr (emoji burada "gülme" değil hafif merak/şaşkınlık; övgü ya da eleştiri unsuru yok)
- "Çekim yaparken hangi telefonu kullanıyorsunuz? #moda 😅" → Nötr (😅 kafa karışıklığını gösteriyor, duygu belirtmiyor)

**Dikkat:** Bu veri setindeki soru örneklerinin büyük çoğunluğu duygu içermeyen saf bilgi talepleri (ürün/mekan/marka adı sorma). Ama gerçek bir sorunun içinde şikayet veya övgü geçiyorsa (örn. "Neden hâlâ cevap yok, bu ne biçim ilgi?"), o zaman kural yine geçerli: duygu baskın gelir → Negatif/Pozitif.

### 2.4 Karma (Mixed) Yorumlar
Kural: Yorumda hem pozitif hem negatif unsur varsa, **baskın/ağır basan duyguya** göre etiketle. Gerçekten eşit ağırlıktaysa → Nötr

**Örnek:**
- "Ürün güzel ama kargo çok geç geldi." → Duruma göre değerlendirilmeli; hangisi öne çıkıyorsa o yönde etiketlenmeli.

### 2.5 Spam / Konu Dışı Yorumlar
Veri setinde duygu taşımayan ama pozitif/negatif/nötr şemasına da girmeyen bir grup daha var: **spam / reklam / alakasız yorumlar**.

**Örnekler:**
- "KRIPTO YATIRIM FIRSATI KAÇIRMA!"
- "1000 TAKIPÇI IÇIN DM"
- "Ücretsiz danışmanlık için bio linki"

**Kural:** Bu tür yorumlar pozitif/negatif/nötr etiketlerinden hiçbirine zorlanmaz. Ayrı bir **"Spam"** etiketi kullan (dördüncü kategori olarak). Bu yorumları veri setinden filtreleyip ayrı tutmak ve etiketleme kapsamı dışında bırakmak önerilir — nötr olarak işaretlemek yanıltıcı olur çünkü içerik/postla ilgisizdir.


---

## 3. Etiketleme Süreci (Adımlar)

1. Yorumu bir kez oku, ilk izlenimini not et.
2. Bölüm 2'deki özel durumlardan birine uyup uymadığını kontrol et.
3. Emin değilsen, kılavuzdaki en yakın örnekle karşılaştır.
4. Hâlâ karasızsan → Nötr olarak etiketle ve "tartışmalı" listesine ekle (bkz. Bölüm 4).
5. Etiketini ve varsa kısa gerekçeni (1 cümle) kaydet.

---

## 4. Tartışmalı Örnekler Listesi

Etiketleyiciler kararsız kaldıkları örnekleri ayrı bir listede toplar. Bu liste, kılavuzun bir sonraki versiyonunda netleştirilecek kuralların kaynağı olur.

---

## 5. Doğrulama (DoD) Süreci

### 5.1 50 Örneğin Seçim Yöntemi (Stratified Sampling)

Veri setindeki (`mock_comments.json`, 2500 yorum) dağılım şöyle: pozitif (%40), negatif (%26), soru (%16), spam (%8), emoji (%5), sarkastik (%4).

Bu dağılıma **birebir orantılı** rastgele seçim yapılırsa, 50'lik örneklemde sarkastik yorum sayısı ~2, emoji ~3 gibi çok az çıkar — oysa kılavuzun asıl test edilmesi gereken yerleri tam da bu az sayıdaki edge case'lerdir (sarkazm, emoji-only, soru). Bu yüzden **kategori bazında minimum sayı garantili, dengeli (stratified) bir örnekleme** kullanıldı:

| Kategori | Seçilen sayı |
|---|---|
| Pozitif | 13 |
| Negatif | 13 |
| Soru | 8 |
| Emoji | 7 |
| Sarkastik | 6 |
| Spam | 3 |
| **Toplam** | **50** |

Bu şekilde kılavuzun en çok tartışmaya açık bölümleri (2.1–2.5) yeterli sayıda örnekle test edilmiş oluyor.


### 5.2 Uyum Testi Adımları

1. Ekipten **2 kişi**, birbirinden bağımsız olarak **aynı 50 örnek yorumu** (`annotation_set_50.csv`, sadece metin sütunu görünür şekilde) bu kılavuzu kullanarak etiketler.
2. İki kişinin etiketleri karşılaştırılır (satır satır eşleştirme).
3. Uyum oranı hesaplanır:
   ```
   Uyum % = (Aynı etiketlenen örnek sayısı / 50) × 100
   ```
4. Uyum oranı **%80 veya üzeri** ise kılavuz onaylanır.
5. %80'in altındaysa: anlaşmazlık çıkan örnekler incelenir, kılavuza yeni kurallar/örnekler eklenir, süreç tekrarlanır.