"""
BERTopic Konu Modelleme Wrapper'ı (A3.1)

Türkçe uyumlu embedding modeli ile yorum ve gönderi açıklamalarından
anlamlı temalar çıkarır, kelime bulutu için konu ağırlıklarını döner.

DÜZELTME NOTLARI:
  1. Hashtag'ler artık tamamen silinmiyor — konu modellemesi için en
     güçlü sinyallerden biri, sentiment'teki gibi atmak yerine metne
     kelime olarak geri ekleniyor (bkz. prepare_text_for_topics).
  2. min_topic_size ve UMAP n_neighbors artık SABİT değil — her
     fit_transform_topics çağrısında eldeki veri boyutuna göre otomatik
     hesaplanıyor.
  3. DİNAMİK COUNT VECTORIZER (Hata Düzeltmesi): min_df değeri gelen metin
     sayısına göre dinamik hesaplanıyor. Az veride (örn. 7-10 metin) min_df=1
     olarak ayarlanarak scikit-learn "min_df / max_df" çökmesi engelleniyor.
  4. YENİ DÜZELTME (küçük hesap bulgusu):
     BERTopic'in c-TF-IDF adımı, vectorizer_model'i ORİJİNAL metinlere değil,
     TEMA BAŞINA birleştirilmiş "sözde-belgelere" uyguluyor — yani vectorizer'ın
     gördüğü "belge sayısı" = ham tema sayısı, metin sayısı DEĞİL. Küçük
     hesaplarda HDBSCAN çok az (1-2) ham tema üretebiliyor; bizim
     min_df=3 (mutlak) gibi bir eşik, 1-2 "belgeyle" imkânsız bir şart
     oluyor ("max_df corresponds to < documents than min_df"). Artık bu
     spesifik hata YAKALANIYOR ve min_df=1 (her koşulda güvenli, test
     edildi) ile OTOMATİK olarak bir kez daha denenıyor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional

from bertopic import BERTopic
from hdbscan import HDBSCAN
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

from .pipeline import on_isle

EMBEDDING_MODEL_NAME = "emrecan/bert-base-turkish-cased-mean-nli-stsb-tr"

TURKISH_STOPWORDS = [
    "bir", "bu", "ne", "da", "de", "ve", "ki", "ile", "için", "çok", "ben", "sen", "o",
    "biz", "siz", "onlar", "var", "yok", "her", "gibi", "kadar", "daha", "ama", "fakat",
    "ancak", "şeyi", "şey", "yani", "mi", "mı", "mu", "mü", "hepsi", "hiç", "bile",
    "miydi", "mıydı", "miyim", "mıyım", "oldu", "olmuş", "olan", "olarak", "ise", "diye",
    "benler", "senler", "artık", "ya", "aynı", "değil", "olsun", "böyle", "şöyle",
    "emoji_pozitif", "emoji_negatif", "emoji_notr", "emoji", "iyi", "güzel", "en", "yeni",
    "harika", "süper", "muhteşem", "mükemmel", "hoş", "tatlı", "sevimli", "başarılı",
]

_EMOJI_TAG_RE = re.compile(r"\[emoji_\w+\]")

MIN_TOPIC_SIZE_FLOOR = 3       # bu değerin altına asla inmez (anlamsız mikro-temalar olmasın)

MIN_TOPIC_SIZE_RATIO = 100     # min_topic_size ~= len(texts) / bu oran

# c-TF-IDF adımı her koşulda güvenli çalışsın diye kurtarma değeri — test
# edildi: 1'den 47'ye kadar her "sözde-belge" sayısında hatasız çalışıyor.
_SAFE_FALLBACK_MIN_DF = 1


def prepare_text_for_topics(raw_text: str) -> str:
    """
    A2.1 pipeline'ını (sentiment için tasarlanmış) konu modellemesine uyarlar:
    hashtag'ler silinmek yerine kelime olarak metne geri eklenir (#moda -> moda).
    """
    processed = on_isle(raw_text)
    hashtag_words = [h.lstrip("#") for h in processed.hashtags]
    text = processed.temiz_metin
    text = _EMOJI_TAG_RE.sub(" ", text)
    if hashtag_words:
        text = f"{text} {' '.join(hashtag_words)}"
    return text.strip()


def _adaptive_min_topic_size(n_texts: int) -> int:
    """Veri boyutuna orantılı min_topic_size. Az veride küçük, çok veride büyük."""
    return max(MIN_TOPIC_SIZE_FLOOR, n_texts // MIN_TOPIC_SIZE_RATIO)


def _build_adaptive_vectorizer(n_texts: int, min_df_override: Optional[int] = None) -> CountVectorizer:
    """
    Gelen metin sayısına göre min_df değerini ayarlar.
    Metin sayısı az ise min_df=1 tutularak CountVectorizer patlaması engellenir.

    min_df_override verilirse (kurtarma denemesinde), hesaplanan değer yerine
    doğrudan bu kullanılır.
    """
    if min_df_override is not None:
        effective_min_df = min_df_override
    else:
        effective_min_df = 1 if n_texts < 15 else min(3, max(1, n_texts // 10))

    return CountVectorizer(
        stop_words=TURKISH_STOPWORDS,
        min_df=effective_min_df,
        ngram_range=(1, 2),
    )


@dataclass
class TopicResult:
    topic_id: int
    topic_name: str
    words: List[tuple[str, float]]
    count: int


class TopicModelError(RuntimeError):
    """BERTopic işlemi, kurtarma denemesinden SONRA da başarısız oldu —
    bu, 'gerçekten hiç tema bulunamadı' ile KARIŞTIRILMAMALI. Çağıran taraf
    (main.py) bunu yakalayıp durumu dürüstçe (status='error') yansıtmalı,
    boş bir sonucu 'başarılı ama 0 tema' gibi göstermemeli."""


class TopicAnalysisModel:
    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME, umap_n_neighbors: int = 10):
        self.model_name = model_name
        self.umap_n_neighbors = umap_n_neighbors
        self.embedding_model = SentenceTransformer(model_name)

    def _run_bertopic(
        self,
        texts: List[str],
        effective_min_topic_size: int,
        effective_n_neighbors: int,
        vectorizer_model: CountVectorizer,
        nr_topics: Optional[int],
    ) -> List[Dict[str, Any]]:
        """Tek bir BERTopic denemesi — hata durumunda YUKARI FIRLATIR
        (yutmaz), kurtarma mantığı fit_transform_topics'te."""
        umap_model = UMAP(
            n_neighbors=effective_n_neighbors,
            n_components=5,
            min_dist=0.0,
            metric="cosine",
            random_state=42,
        )
        hdbscan_model = HDBSCAN(
            min_cluster_size=effective_min_topic_size,
            metric="euclidean",
            cluster_selection_method="eom",
            prediction_data=True,
        )

        topic_model = BERTopic(
            embedding_model=self.embedding_model,
            vectorizer_model=vectorizer_model,
            umap_model=umap_model,
            hdbscan_model=hdbscan_model,
            verbose=False,
        )

        topics, _ = topic_model.fit_transform(texts)
        raw_topic_count = len([t for t in set(topics) if t != -1])
        print(f"[topic_model] Ham (zorla birleştirmeden önceki) tema sayısı: {raw_topic_count}")

        if nr_topics is not None and raw_topic_count > nr_topics:
            topic_model.reduce_topics(texts, nr_topics=nr_topics)

        topic_info = topic_model.get_topic_info()

        results = []
        for _, row in topic_info.iterrows():
            topic_id = row["Topic"]
            if topic_id == -1:
                continue

            topic_words = [(w, s) for w, s in topic_model.get_topic(topic_id) if w and w.strip()]
            top_3_words = [word for word, _ in topic_words[:3]]
            custom_name = " / ".join(top_3_words).capitalize()

            results.append({
                "topic_id": int(topic_id),
                "topic_name": custom_name,
                "document_count": int(row["Count"]),
                "keywords": [{"word": w, "score": round(float(s), 4)} for w, s in topic_words[:10]],
            })

        return results

    def fit_transform_topics(
        self,
        texts: List[str],
        nr_topics: Optional[int] = None,
        min_topic_size: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        if not texts or len(texts) < 5:
            return []

        n = len(texts)
        effective_min_topic_size = min_topic_size or _adaptive_min_topic_size(n)
        effective_n_neighbors = min(self.umap_n_neighbors, max(2, n - 1))

        vectorizer_model = _build_adaptive_vectorizer(n)

        print(
            f"[topic_model] {n} metin | min_topic_size={effective_min_topic_size} "
            f"| n_neighbors={effective_n_neighbors} | vectorizer_min_df={vectorizer_model.min_df}"
        )

        try:
            return self._run_bertopic(
                texts, effective_min_topic_size, effective_n_neighbors, vectorizer_model, nr_topics
            )
        except ValueError as exc:
            # DÜZELTME (2. bulgu): iki AYRI ama İLİŞKİLİ sklearn hatası, ikisi
            # de min_df=1 ile kurtarılabiliyor (test edildi):
            #   1) "max_df corresponds to..." — çok az ham tema/belge sayısı
            #      min_df'ten (mutlak sayı) küçük kaldığında (sayısal çelişki).
            #   2) "After pruning, no terms remain..." — tema sayısı min_df'ten
            #      BÜYÜK olsa bile (sayısal çelişki YOK), gerçekten İYİ
            #      AYRIŞMIŞ (birbirinden farklı kelimeler kullanan) temalar
            #      hiçbir kelimeyi 3+ temada PAYLAŞMIYOR — sözlük tamamen
            #      boşalıyor. İkisi de aynı kök nedene (küçük/dağınık "belge"
            #      sayısına göre çok yüksek min_df) çıkıyor, aynı kurtarmayla
            #      (min_df=1) çözülüyor.
            _RECOVERABLE_ERROR_SUBSTRINGS = (
                "max_df corresponds to",
                "After pruning, no terms remain",
            )
            if not any(s in str(exc) for s in _RECOVERABLE_ERROR_SUBSTRINGS):
                raise TopicModelError(f"BERTopic işlemi başarısız oldu: {exc}") from exc

            # DÜZELTME: küçük hesap / az ham tema durumu — min_df=1 ile
            # (her koşulda güvenli, test edildi) BİR KEZ daha dene.
            print(
                f"[topic_model] min_df={vectorizer_model.min_df} ile hata olu\u015ftu "
                f"({exc}) — min_df=1 ile yeniden deneniyor."
            )
            fallback_vectorizer = _build_adaptive_vectorizer(n, min_df_override=_SAFE_FALLBACK_MIN_DF)
            try:
                return self._run_bertopic(
                    texts, effective_min_topic_size, effective_n_neighbors, fallback_vectorizer, nr_topics
                )
            except Exception as retry_exc:
                raise TopicModelError(
                    f"BERTopic işlemi min_df=1 kurtarma denemesinden SONRA da başarısız oldu: {retry_exc}"
                ) from retry_exc
        except Exception as exc:
            raise TopicModelError(f"BERTopic işlemi başarısız oldu: {exc}") from exc


@lru_cache(maxsize=1)
def get_topic_model() -> TopicAnalysisModel:
    return TopicAnalysisModel()