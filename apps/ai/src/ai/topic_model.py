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
    "emoji_pozitif", "emoji_negatif", "emoji_notr", "emoji",
]

_EMOJI_TAG_RE = re.compile(r"\[emoji_\w+\]")

MIN_TOPIC_SIZE_FLOOR = 3       # bu değerin altına asla inmez (anlamsız mikro-temalar olmasın)
MIN_TOPIC_SIZE_RATIO = 20      # min_topic_size ~= len(texts) / bu oran


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


def _build_adaptive_vectorizer(n_texts: int) -> CountVectorizer:
    """
    Gelen metin sayısına göre min_df değerini ayarlar.
    Metin sayısı az ise min_df=1 tutularak CountVectorizer patlaması engellenir.
    """
    # 15 metinden azsa min_df=1, çoksa min_df=2 veya 3 olacak şekilde ayarla
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


class TopicAnalysisModel:
    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME, umap_n_neighbors: int = 10):
        self.model_name = model_name
        self.umap_n_neighbors = umap_n_neighbors
        self.embedding_model = SentenceTransformer(model_name)

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
        # UMAP n_neighbors örnek sayısını aşamaz (aksi halde hata fırlatır)
        effective_n_neighbors = min(self.umap_n_neighbors, max(2, n - 1))
        
        # Dinamik CountVectorizer oluşturma
        vectorizer_model = _build_adaptive_vectorizer(n)

        print(
            f"[topic_model] {n} metin | min_topic_size={effective_min_topic_size} "
            f"| n_neighbors={effective_n_neighbors} | vectorizer_min_df={vectorizer_model.min_df}"
        )

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

        try:
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

                topic_words = topic_model.get_topic(topic_id)
                top_3_words = [word for word, _ in topic_words[:3]]
                custom_name = " / ".join(top_3_words).capitalize()

                results.append({
                    "topic_id": int(topic_id),
                    "topic_name": custom_name,
                    "document_count": int(row["Count"]),
                    "keywords": [{"word": w, "score": round(float(s), 4)} for w, s in topic_words[:10]],
                })

            return results

        except Exception as e:
            print(f"[topic_model] BERTopic işlem hatası oluştu: {e}")
            return []


@lru_cache(maxsize=1)
def get_topic_model() -> TopicAnalysisModel:
    return TopicAnalysisModel()