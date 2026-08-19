<!-- apps/web/app/pages/accounts/[id].vue -->
<template>
  <div class="account-detail-page">
    <header class="page-header">
      <NuxtLink to="/accounts" class="back-link">← Hesaplara Dön</NuxtLink>

      <div v-if="account" class="profile-header-card">
        <div class="profile-main-info">
          <div class="avatar-circle font-serif-display" aria-hidden="true">{{ account.avatar || 'IG' }}</div>
          <div>
            <h1 class="profile-title font-serif-display">@{{ account.igUsername }}</h1>
            <p class="profile-sub">{{ account.name }} · Kaynak: <span class="badge-source">{{ account.source }}</span></p>
          </div>
        </div>
        <div class="profile-stats-row">
          <div class="stat-box">
            <span class="stat-label">TAKİPÇİ</span>
            <span class="stat-val font-serif-display">{{ account.followers || '—' }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">ETKİLEŞİM ORANI</span>
            <span class="stat-val font-serif-display highlight-pink">{{ account.er || '—' }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">DURUM</span>
            <span :class="['status-dot', account.status === 'Aktif' ? 'active' : 'pending']">
              {{ account.status }}
            </span>
          </div>
        </div>
      </div>
      <div v-else-if="loading" class="skeleton-box header-skeleton"></div>
    </header>

    <!-- METRİK ZAMAN SERİSİ GRAFİĞİ -->
    <section class="panel-card mb-6" aria-labelledby="chart-heading">
      <div class="panel-header">
        <div>
          <h2 id="chart-heading" class="panel-title font-serif-display">Takipçi Değişimi & Büyüme Trendi</h2>
          <p class="panel-sub">Zaman içindeki takipçi sayısı performans değişimi</p>
        </div>
        <div class="time-pills">
          <button
            v-for="range in rangeOptions"
            :key="range"
            :class="['pill-btn', { active: selectedRange === range }]"
            :aria-label="`${range} günlük zaman aralığı`"
            @click="changeRange(range)"
          >
            {{ range }}g
          </button>
        </div>
      </div>

      <div class="chart-container-fixed">
        <div v-if="!chartLoading && followerSeries.length === 0" class="chart-empty-note">
          <AppEmptyState
            title="Takipçi verisi henüz yok"
            description="Backend, bu hesabın büyüme geçmişini henüz kaydetmedi. Toplama süreci ilerledikçe burada görünecek."
          />
        </div>
        <ClientOnly v-else>
          <LazyLineChart
            v-if="isMounted"
            :key="`chart-${accountId}-${selectedRange}`"
            :data="followerSeries"
            :loading="chartLoading"
            color="var(--brand)"
            height="240px"
            :show-axis="true"
            :value-formatter="(v) => `${v.toLocaleString('tr-TR')} takipçi`"
          />
          <div v-else class="skeleton-box chart-skeleton"></div>
        </ClientOnly>
      </div>
    </section>

    <!-- EN İYİ PAYLAŞIM ZAMANI / ISI HARİTASI (F3.3) -->
    <section class="panel-card mb-6" aria-labelledby="besttimes-heading">
      <h2 id="besttimes-heading" class="sr-only">En İyi Paylaşım Zamanı Analizi</h2>
      <div class="besttimes-container-fixed">
        <ClientOnly>
          <LazyBestTimesChart
            v-if="isMounted"
            :heatmap-data="bestTimesData"
            :loading="bestTimesLoading"
            :error="bestTimesError"
            @retry="fetchBestTimes"
          />
          <div v-else class="skeleton-box heatmap-skeleton"></div>
        </ClientOnly>
      </div>
    </section>

    <!-- DUYGU ANALİZİ (SENTIMENT) GÖRÜNÜMÜ (F3.1) -->
    <section class="panel-card mb-6" aria-labelledby="sentiment-heading">
      <div class="panel-header">
        <div>
          <h2 id="sentiment-heading" class="panel-title font-serif-display">🤖 Yapay Zeka Duygu Analizi (Sentiment)</h2>
          <p class="panel-sub">Gönderi bazında pozitif, nötr ve negatif yorum dağılımı</p>
        </div>
      </div>

      <!-- Yükleniyor -->
      <div v-if="sentimentLoading" class="skeleton-box" style="height: 160px; border-radius: 14px;"></div>

      <!-- Gerçek bir hata -->
      <AppEmptyState
        v-else-if="sentimentError"
        type="error"
        title="Duygu analizi yüklenemedi"
        description="Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene."
        action-label="Tekrar dene"
        @action="fetchSentiment"
      />

      <!-- Henüz yorum yok -->
      <AppEmptyState
        v-else-if="!hasSentimentData"
        title="Henüz analiz edilecek yorum yok"
        description="Bu hesap için toplama/analiz süreci devam ediyor. Veri geldiğinde burada görünecek."
      />

      <!-- Gerçek veri var -->
      <template v-else>
        <div class="sentiment-bar-wrapper mb-6">
          <div class="sentiment-bar">
            <div class="bar-segment pos" :style="{ width: `${sentimentData.distribution.positive}%` }">
              %{{ sentimentData.distribution.positive }}
            </div>
            <div class="bar-segment neu" :style="{ width: `${sentimentData.distribution.neutral}%` }">
              %{{ sentimentData.distribution.neutral }}
            </div>
            <div class="bar-segment neg" :style="{ width: `${sentimentData.distribution.negative}%` }">
              %{{ sentimentData.distribution.negative }}
            </div>
          </div>
          <div class="sentiment-legend">
            <span><i class="dot pos"></i> Pozitif (%{{ sentimentData.distribution.positive }})</span>
            <span><i class="dot neu"></i> Nötr (%{{ sentimentData.distribution.neutral }})</span>
            <span><i class="dot neg"></i> Negatif (%{{ sentimentData.distribution.negative }})</span>
          </div>
          <p class="sentiment-total-note">
            Toplam {{ sentimentData.totalAnalyzedComments }} yorum, {{ sentimentData.posts.length }} gönderi üzerinden analiz edildi.
          </p>
        </div>

        <div class="comments-section">
          <div class="flex-between mb-4">
            <h3 class="sub-heading">Gönderi Bazlı Duygu Dağılımı</h3>
            <div class="filter-pills">
              <button
                v-for="f in ['Tümü', 'POSITIVE', 'NEUTRAL', 'NEGATIVE']"
                :key="f"
                :class="['filter-btn', { active: activeSentimentFilter === f }]"
                :aria-label="`Duygu filtresi: ${f}`"
                @click="activeSentimentFilter = f"
              >
                {{ f === 'Tümü' ? 'Tümü' : f === 'POSITIVE' ? 'Pozitif' : f === 'NEUTRAL' ? 'Nötr' : 'Negatif' }}
              </button>
            </div>
          </div>

          <AppEmptyState
            v-if="filteredSentimentPosts.length === 0"
            title="Bu filtreye uyan gönderi yok"
            description="Farklı bir duygu filtresi dene."
          />

          <div v-else class="comments-list">
            <div v-for="post in filteredSentimentPosts" :key="post.postId" class="comment-item post-sentiment-item">
              <div class="post-sentiment-main">
                <span class="comment-author">{{ post.caption }}</span>
                <div class="mini-sentiment-bar">
                  <div class="mini-seg pos" :style="{ width: `${post.positive.percentage}%` }"></div>
                  <div class="mini-seg neu" :style="{ width: `${post.neutral.percentage}%` }"></div>
                  <div class="mini-seg neg" :style="{ width: `${post.negative.percentage}%` }"></div>
                </div>
                <span class="post-comment-count">
                  {{ post.totalAnalyzedComments }} yorum analiz edildi
                  <template v-if="postDateById.get(post.postId)"> · {{ formatDate(postDateById.get(post.postId)!) }}</template>
                </span>

                <div v-if="getPostReasonKeywords(post.postId).length > 0" class="sentiment-reason-tag">
                  <span class="reason-icon">💬</span>
                  <span class="reason-label">En çok bahsedilen:</span>
                  <span class="reason-words">{{ getPostReasonKeywords(post.postId).join(', ') }}</span>
                </div>
              </div>
              <div class="comment-right">
                <span :class="['badge-sentiment', dominantSentiment(post).toLowerCase()]">
                  {{ dominantSentiment(post) }}
                </span>
                <span class="comment-date">
                  %{{ post.positive.percentage.toFixed(0) }} / %{{ post.neutral.percentage.toFixed(0) }} / %{{ post.negative.percentage.toFixed(0) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="trend-section">
          <h3 class="sub-heading mb-3">📈 Zaman İçinde Duygu Trendi</h3>

          <AppEmptyState
            v-if="sentimentTrend.length < 2"
            title="Trend için yeterli veri yok"
            description="Duygu trendini gösterebilmek için en az iki farklı tarihte analiz edilmiş gönderi gerekiyor."
          />
          <div v-else class="trend-chart-fixed">
            <ClientOnly>
              <LazySentimentTrendChart v-if="isMounted" :data="sentimentTrend" />
              <div v-else class="skeleton-box chart-skeleton"></div>
            </ClientOnly>
          </div>
        </div>
      </template>
    </section>

    <!-- ETKİLEŞİM TAHMİN MODELİ (likes_baseline) -->
    <section class="panel-card mb-6" aria-labelledby="likes-baseline-heading">
      <div class="panel-header">
        <div>
          <h2 id="likes-baseline-heading" class="panel-title font-serif-display">📊 Etkileşim Tahmin Modeli</h2>
          <p class="panel-sub">Yapay zeka modelinin beğeni tahmin performansı</p>
        </div>
      </div>

      <div v-if="likesBaselineLoading" class="skeleton-box" style="height: 100px; border-radius: 14px;"></div>

      <AppEmptyState
        v-else-if="!likesBaselineData"
        title="Tahmin modeli verisi yok"
        description="Bu hesap için henüz yeterli veri toplanmadı."
      />

      <div v-else class="baseline-card" :class="{ good: likesBaselineData.beatsNaive }">
        <div class="baseline-main">
          <span class="baseline-icon">{{ baselineIcon(likesBaselineData) }}</span>
          <div>
            <p class="baseline-title">{{ baselineHeadline(likesBaselineData) }}</p>
            <p class="baseline-sub">
              {{ likesBaselineData.modelType }} modeli · ortalama hata payı: {{ likesBaselineData.mae.toFixed(0) }}
            </p>
          </div>
        </div>
        <p v-if="likesBaselineData.sampleSize < 20" class="baseline-warning">
          Bu sonuç şu ana kadar sadece {{ likesBaselineData.sampleSize }} gönderiye dayanıyor, daha fazla veri toplandıkça netleşecek.
        </p>
      </div>
    </section>

    <!-- CANLI BEĞENİ TAHMİNİ (PREDICT LIKES) -->
    <section class="panel-card mb-6" aria-labelledby="predict-likes-heading">
      <div class="panel-header">
        <div>
          <h2 id="predict-likes-heading" class="panel-title font-serif-display">🔮 Paylaşım Öncesi Beğeni Tahmini</h2>
          <p class="panel-sub">Planladığın bir postu paylaşmadan önce yapay zeka ile test et</p>
        </div>
      </div>

      <div class="predict-form">
        <div class="predict-row">
          <div class="predict-input-group">
            <label class="predict-label">PAYLAŞIM GÜNÜ</label>
            <select v-model.number="predictForm.dayOfWeek" class="select-input w-full">
              <option v-for="d in dayOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>

          <div class="predict-input-group">
            <label class="predict-label">PAYLAŞIM SAATİ</label>
            <select v-model.number="predictForm.hour" class="select-input w-full">
              <option v-for="h in hourOptions" :key="h" :value="h">{{ String(h).padStart(2, '0') }}:00</option>
            </select>
          </div>

          <div class="predict-input-group">
            <label class="predict-label">İÇERİK TÜRÜ</label>
            <select v-model="predictForm.contentType" class="select-input w-full">
              <option value="IMAGE">Fotoğraf</option>
              <option value="VIDEO">Reel / Video</option>
              <option value="CAROUSEL">Kaydırmalı (Carousel)</option>
            </select>
          </div>
        </div>

        <div class="predict-input-group">
          <label class="predict-label">GÖNDERİ AÇIKLAMASI (CAPTION)</label>
          <textarea
            v-model="predictForm.caption"
            class="predict-textarea"
            placeholder="Taslak açıklamanı buraya yaz... (emoji ve hashtag'ler analizi güçlendirir)"
            rows="3"
          ></textarea>
        </div>

        <div class="predict-actions">
          <button
            class="submit-btn"
            style="width: fit-content; padding: 10px 24px;"
            :disabled="predictLoading"
            @click="runPredictLikes"
          >
            <span v-if="predictLoading" class="spinner"></span>
            <span>{{ predictLoading ? 'Hesaplanıyor...' : 'Beğeniyi Tahmin Et ✨' }}</span>
          </button>
        </div>

        <AppEmptyState
          v-if="predictError"
          type="error"
          title="Tahmin hesaplanamadı"
          description="Model bu hesap için henüz eğitilmemiş olabilir veya sunucu bağlantı hatası oluştu."
        />

        <div v-if="predictResult" class="predict-result-card">
          <span class="predict-result-icon">✨</span>
          <span class="predict-result-label">YAPAY ZEKA TAHMİNİ BEĞENİ SAYISI</span>
          <span class="predict-result-value font-serif-display">
            {{ Math.round(predictResult.predicted_likes).toLocaleString('tr-TR') }}
          </span>
          <span class="predict-result-sub">Bu tahmin hesabın geçmiş etkileşim dinamikleri baz alınarak hesaplandı.</span>
        </div>
      </div>
    </section>

    <!-- SPAM / BOT TESPİTİ -->
    <section class="panel-card mb-6" aria-labelledby="spam-heading">
      <div class="panel-header">
        <div>
          <h2 id="spam-heading" class="panel-title font-serif-display">🚫 Spam/Bot Tespiti</h2>
          <p class="panel-sub">Yapay zeka ile şüpheli yorum tespiti</p>
        </div>
      </div>

      <div v-if="spamLoading" class="skeleton-box" style="height: 140px; border-radius: 14px;"></div>

      <AppEmptyState
        v-else-if="spamError"
        type="error"
        title="Spam analizi yüklenemedi"
        description="Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene."
        action-label="Tekrar dene"
        @action="fetchSpamAnalysis"
      />

      <AppEmptyState
        v-else-if="spamData.totalFlagged === 0"
        title="✅ Hiç şüpheli yorum tespit edilmedi"
        :description="`${spamData.totalComments} yorumun tamamı temiz görünüyor`"
      />

      <template v-else>
        <p class="spam-summary-note">
          ⚠️ {{ spamData.totalFlagged }} yorum şüpheli (toplam {{ spamData.totalComments }} yorumun %{{ spamData.flaggedPercentage.toFixed(1) }}'i)
        </p>
        <p v-if="spamData.totalComments < 20" class="baseline-warning">
          ⚠️ Küçük örneklem — bu oran yanıltıcı olabilir.
        </p>

        <div class="comments-list mt-4">
          <div v-for="c in spamData.flaggedComments" :key="c.commentId" class="comment-item">
            <p class="comment-text">"{{ c.text }}"</p>
            <span :class="['badge-sentiment', riskLevel(c.confidence) === 'high' ? 'negative' : 'neutral']">
              {{ riskLevel(c.confidence) === 'high' ? '🔴 Yüksek risk' : '🟡 Orta risk' }} (%{{ (c.confidence * 100).toFixed(0) }})
            </span>
          </div>
        </div>
      </template>
    </section>

    <!-- KONU ANALİZİ (BERTopic) GÖRÜNÜMÜ (F3.2) -->
    <section class="panel-card mb-6" aria-labelledby="topic-heading">
      <div class="panel-header">
        <div>
          <h2 id="topic-heading" class="panel-title font-serif-display">📌 Konu Analizi & Kelime Bulutu (BERTopic)</h2>
          <p class="panel-sub">Öne çıkan konular, anahtar kelimeler ve ilgili yorumlar</p>
        </div>
        <span v-if="topicsData" class="badge-source">
          {{ topicsData.total_topics || topicsData.topics?.length || 0 }} Konu Tespit Edildi
        </span>
      </div>

      <div v-if="topicsLoading" class="skeleton-box" style="height: 180px; border-radius: 14px;"></div>

      <AppEmptyState
        v-else-if="topicsError || !topicsData || !topicsData.topics || topicsData.topics.length === 0"
        title="Konu analizi verisi yok"
        description="Bu hesap için henüz konu modelleme (BERTopic) verisi işlenmedi."
      />

      <div v-else class="topics-grid">
        <div class="topics-left">
          <div class="word-cloud-box mb-4">
            <h3 class="sub-heading mb-2">☁️ Öne Çıkan Kelimeler</h3>
            <div class="word-cloud-tags">
              <button
                v-for="(word, idx) in allKeywords"
                :key="idx"
                class="word-tag-btn"
                :style="{ fontSize: word.size, opacity: word.opacity }"
                :aria-label="`Anahtar kelime ${word.text}`"
                @click="selectTopicByKeyword(word.text)"
              >
                #{{ word.text }}
              </button>
            </div>
          </div>

          <h3 class="sub-heading mb-2">Öne Çıkan Temalar</h3>
          <div class="topic-items-list">
            <div
              v-for="topic in topicsData.topics"
              :key="topic.topicId"
              :class="['comment-item', 'topic-card-item', { active: selectedTopic?.topicId === topic.topicId }]"
              tabindex="0"
              role="button"
              :aria-label="`${topic.topicName} teması seç`"
              @click="selectedTopic = topic"
              @keydown.enter="selectedTopic = topic"
            >
              <div class="topic-info">
                <span class="topic-title">{{ topic.topicName }}</span>
                <div class="topic-keywords">
                  <span v-for="kw in topic.keywords" :key="kw" class="kw-tag">#{{ kw }}</span>
                </div>
              </div>
              <span class="badge-source">{{ topic.count }} yorum</span>
            </div>
          </div>
        </div>

        <div class="topics-right">
          <div v-if="selectedTopic" class="selected-topic-comments">
            <div class="flex-between mb-3">
              <h3 class="sub-heading">💬 "{{ selectedTopic.topicName }}" İlgili Yorumları</h3>
              <span class="post-comment-count">{{ selectedTopic.sampleComments?.length || 0 }} örnek gösteriliyor</span>
            </div>

            <div v-if="selectedTopic.sampleComments && selectedTopic.sampleComments.length" class="comments-list">
              <div v-for="c in selectedTopic.sampleComments" :key="c.id" class="comment-item">
                <div class="comment-main">
                  <p class="comment-text">"{{ c.text }}"</p>
                  <span v-if="c.commentedAt" class="comment-date">{{ formatDate(c.commentedAt) }}</span>
                </div>
                <span :class="['badge-sentiment', (c.sentiment || 'neutral').toLowerCase()]">
                  {{ c.sentiment === 'positive' ? 'Pozitif' : c.sentiment === 'negative' ? 'Negatif' : 'Nötr' }}
                </span>
              </div>
            </div>
            <AppEmptyState
              v-else
              title="Örnek yorum bulunamadı"
              description="Bu konuya ait gösterilecek örnek yorum bulunmuyor."
            />
          </div>
        </div>
      </div>
    </section>

    <!-- GÖNDERİ LİSTESİ -->
    <section class="panel-card" aria-labelledby="posts-heading">
      <div class="panel-header flex-wrap gap-4">
        <div>
          <h2 id="posts-heading" class="panel-title font-serif-display">Son Gönderiler & Analiz</h2>
          <p class="panel-sub">Hesaba ait içerik performansı ve etkileşim detayları</p>
        </div>

        <div class="controls-group">
          <div class="filter-pills">
            <button
              v-for="t in typeFilterOptions"
              :key="t.val"
              :class="['filter-btn', { active: selectedType === t.val }]"
              :aria-label="`Gönderi türü filtresi: ${t.label}`"
              @click="changeFilterType(t.val)"
            >
              {{ t.label }}
            </button>
          </div>

          <label for="post-sort-select" class="sr-only">Gönderi Sıralaması</label>
          <select id="post-sort-select" v-model="selectedSort" aria-label="Gönderileri sırala" class="select-input">
            <option value="date">En Yeni Tarih</option>
            <option value="engagement">En Yüksek Etkileşim</option>
            <option value="likes">En Çok Beğeni</option>
          </select>
        </div>
      </div>

      <div v-if="postsLoading" class="posts-grid">
        <div v-for="n in 6" :key="n" class="skeleton-box post-skeleton"></div>
      </div>

      <AppEmptyState
        v-else-if="displayedPosts.length === 0"
        title="Gönderi bulunamadı"
        description="Seçilen filtrelere uygun gönderi yok. Farklı bir tür veya sıralama deneyin."
      />

      <div v-else class="posts-grid">
        <div v-for="post in displayedPosts" :key="post.id" class="post-card">
          <div class="thumb-wrap">
            <img
              v-if="post.thumbnailUrl && !brokenImageIds.has(post.id)"
              :src="post.thumbnailUrl"
              :alt="post.caption || 'Instagram Gönderisi'"
              loading="lazy"
              @error="brokenImageIds.add(post.id)"
            />
            <div v-else class="thumb-placeholder" aria-hidden="true">
              <span>{{ post.type === 'reel' ? '🎬' : post.type === 'carousel' ? '🖼️' : '🖼' }}</span>
            </div>
            <span class="type-badge">{{ post.type.toUpperCase() }}</span>
          </div>
          <div class="post-body">
            <p class="post-caption">{{ post.caption }}</p>
            <span class="post-date">{{ formatDate(post.postedAt) }}</span>
            <div class="post-metrics-grid">
              <div class="metric-item">
                <span class="m-lbl">❤️ BEĞENİ</span>
                <span class="m-val">{{ post.metrics.likes.toLocaleString('tr-TR') }}</span>
              </div>
              <div class="metric-item">
                <span class="m-lbl">💬 YORUM</span>
                <span class="m-val">{{ post.metrics.commentsCount.toLocaleString('tr-TR') }}</span>
              </div>
              <div class="metric-item">
                <span class="m-lbl">⚡️ ETKİLEŞİM</span>
                <span class="m-val highlight-purple">%{{ post.metrics.engagementRate }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import auth from '~/middleware/auth'
import { useApi } from '~/composables/useApi'
import { dominantSentiment, type SentimentData, type TopicsData, type Topic, type LikesBaselineData, type SpamData, riskLevel, type SentimentReason } from '~/utils/apiMappers'
import type { Account, TimeSeriesPoint, PostItem, PostSortOption, PostTypeFilter } from '~/utils/mockData'
import type { SentimentTrendPoint } from '~/components/charts/SentimentTrendChart.vue'

definePageMeta({
  middleware: auth
})

const route = useRoute()
const api = useApi()

const accountId = computed(() => route.params.id as string)

const rangeOptions = [7, 30, 90] as const
const typeFilterOptions: { label: string; val: PostTypeFilter }[] = [
  { label: 'Tümü', val: 'all' },
  { label: 'Reels', val: 'reel' },
  { label: 'Fotoğraf', val: 'image' },
  { label: 'Carousel', val: 'carousel' }
]

const account = ref<Account | null>(null)
const loading = ref(true)

const followerSeries = ref<TimeSeriesPoint[]>([])
const chartLoading = ref(true)
const selectedRange = ref<7 | 30 | 90>(30)

const posts = ref<PostItem[]>([])
const postsLoading = ref(true)
const brokenImageIds = ref(new Set<string>())
const selectedType = ref<PostTypeFilter>('all')
const selectedSort = ref<PostSortOption>('date')

const sentimentData = ref<SentimentData>({
  distribution: { positive: 0, neutral: 0, negative: 0 },
  totalAnalyzedComments: 0,
  posts: []
})
const sentimentReasons = ref<SentimentReason[]>([])
const sentimentLoading = ref(true)
const sentimentError = ref(false)
const activeSentimentFilter = ref('Tümü')

// BERTopic Konu Analizi State'leri (F3.2)
const topicsData = ref<TopicsData | null>(null)
const topicsLoading = ref(true)
const topicsError = ref(false)
const selectedTopic = ref<Topic | null>(null)

// En İyi Paylaşım Zamanı State'leri (F3.3)
const bestTimesData = ref([])
const bestTimesLoading = ref(true)
const bestTimesError = ref(false)

// Etkileşim Tahmin Modeli (likes_baseline) State'leri
const likesBaselineData = ref<LikesBaselineData | null>(null)
const likesBaselineLoading = ref(true)

// CANLI BEĞENİ TAHMİNİ (PREDICT LIKES) STATE'LERİ
const dayOptions = [
  { label: 'Pazartesi', value: 1 },
  { label: 'Salı', value: 2 },
  { label: 'Çarşamba', value: 3 },
  { label: 'Perşembe', value: 4 },
  { label: 'Cuma', value: 5 },
  { label: 'Cumartesi', value: 6 },
  { label: 'Pazar', value: 7 }
]
const hourOptions = Array.from({ length: 24 }, (_, i) => i)

const predictForm = ref({
  dayOfWeek: 4,
  hour: 10,
  contentType: 'VIDEO' as 'IMAGE' | 'VIDEO' | 'CAROUSEL',
  caption: ''
})
const predictLoading = ref(false)
const predictError = ref(false)
const predictResult = ref<{ predicted_likes: number } | null>(null)

async function runPredictLikes() {
  predictLoading.value = true
  predictError.value = false
  predictResult.value = null
  try {
    predictResult.value = await api.predictLikes(accountId.value, {
      hour: predictForm.value.hour,
      dayOfWeek: predictForm.value.dayOfWeek,
      caption: predictForm.value.caption,
      contentType: predictForm.value.contentType
    })
  } catch (err) {
    console.error('Tahmin hatası:', err)
    predictError.value = true
  } finally {
    predictLoading.value = false
  }
}

// Spam/Bot Tespiti State'leri
const spamData = ref<SpamData>({ totalComments: 0, totalFlagged: 0, flaggedPercentage: 0, flaggedComments: [] })
const spamLoading = ref(true)
const spamError = ref(false)

// Grafiklerin ilk boyamayı bloke etmesini önleyen gecikme bayrağı
const isMounted = ref(false)
onMounted(() => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => { isMounted.value = true })
  } else {
    setTimeout(() => { isMounted.value = true }, 150)
  }
})

const hasSentimentData = computed(() => sentimentData.value.posts.length > 0)

const filteredSentimentPosts = computed(() => {
  if (activeSentimentFilter.value === 'Tümü') return sentimentData.value.posts
  return sentimentData.value.posts.filter(p => dominantSentiment(p) === activeSentimentFilter.value)
})

const postDateById = computed(() => {
  const map = new Map<string, string>()
  posts.value.forEach(p => map.set(p.id, p.postedAt))
  return map
})

const sentimentReasonsByPostId = computed(() => {
  const map = new Map<string, string[]>()
  sentimentReasons.value.forEach(r => {
    const words = (r.keywords || []).map(k => k.word).filter(Boolean)
    if (words.length > 0) {
      map.set(r.postId, words)
    }
  })
  return map
})

function getPostReasonKeywords(postId: string): string[] {
  return sentimentReasonsByPostId.value.get(postId) || []
}

// Gönderileri backend'den çektikten sonra reaktif olarak filtreleyen computed
const displayedPosts = computed(() => {
  let list = [...posts.value]

  if (selectedType.value !== 'all') {
    list = list.filter(p => p.type === selectedType.value)
  }

  if (selectedSort.value === 'likes') {
    list.sort((a, b) => (b.metrics?.likes ?? 0) - (a.metrics?.likes ?? 0))
  } else if (selectedSort.value === 'engagement') {
    list.sort((a, b) => (b.metrics?.engagementRate ?? 0) - (a.metrics?.engagementRate ?? 0))
  } else {
    list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
  }

  return list
})

const sentimentTrend = computed<SentimentTrendPoint[]>(() => {
  const byDate = new Map<string, { pos: number; neu: number; neg: number; total: number }>()

  sentimentData.value.posts.forEach(p => {
    const iso = postDateById.value.get(p.postId)
    if (!iso) return
    const date = iso.slice(0, 10)
    if (!byDate.has(date)) byDate.set(date, { pos: 0, neu: 0, neg: 0, total: 0 })
    const entry = byDate.get(date)!
    entry.pos += p.positive.count
    entry.neu += p.neutral.count
    entry.neg += p.negative.count
    entry.total += p.totalAnalyzedComments
  })

  return Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      positive: v.total > 0 ? Math.round((v.pos / v.total) * 100) : 0,
      neutral: v.total > 0 ? Math.round((v.neu / v.total) * 100) : 0,
      negative: v.total > 0 ? Math.round((v.neg / v.total) * 100) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
})

const allKeywords = computed(() => {
  if (!topicsData.value?.topics) return []
  const list: { text: string; size: string; opacity: number }[] = []
  topicsData.value.topics.forEach((t) => {
    (t.keywords || []).forEach((kw, i) => {
      list.push({
        text: kw,
        size: `${Math.max(0.78, 1.15 - i * 0.1)}rem`,
        opacity: Math.max(0.75, 1 - i * 0.1)
      })
    })
  })
  return list
})

function selectTopicByKeyword(kw: string) {
  const found = topicsData.value?.topics.find((t) => t.keywords?.includes(kw))
  if (found) {
    selectedTopic.value = found
  }
}

async function fetchAccountDetails() {
  loading.value = true
  try {
    account.value = await api.getAccountById(accountId.value)
  } catch (err) {
    console.error('Hesap detay hatası:', err instanceof Error ? err.message : err)
  } finally {
    loading.value = false
  }
}

async function fetchChartData() {
  chartLoading.value = true
  try {
    followerSeries.value = await api.getFollowerTimeseries(accountId.value, selectedRange.value)
  } catch (err) {
    console.error('Grafik veri hatası:', err instanceof Error ? err.message : err)
  } finally {
    chartLoading.value = false
  }
}

async function fetchSentiment() {
  sentimentLoading.value = true
  sentimentError.value = false
  try {
    const [sentRes, reasonsRes] = await Promise.all([
      api.getSentimentData(accountId.value),
      api.getSentimentReasons(accountId.value).catch(() => [])
    ])
    sentimentData.value = sentRes
    sentimentReasons.value = reasonsRes
  } catch (err) {
    console.error('Sentiment yükleme hatası:', err)
    sentimentError.value = true
  } finally {
    sentimentLoading.value = false
  }
}

async function fetchTopics() {
  topicsLoading.value = true
  topicsError.value = false
  try {
    const res = await api.getTopics(accountId.value)
    topicsData.value = res
    if (res?.topics?.length) {
      selectedTopic.value = res.topics[0]
    }
  } catch (err) {
    console.error('Topics yükleme hatası:', err)
    topicsError.value = true
  } finally {
    topicsLoading.value = false
  }
}

async function fetchBestTimes() {
  bestTimesLoading.value = true
  bestTimesError.value = false
  try {
    bestTimesData.value = await api.getBestTimes(accountId.value)
  } catch (err) {
    console.error('En iyi zamanlar yüklenemedi:', err)
    bestTimesError.value = true
  } finally {
    bestTimesLoading.value = false
  }
}

async function fetchLikesBaseline() {
  likesBaselineLoading.value = true
  try {
    likesBaselineData.value = await api.getLikesBaseline(accountId.value)
  } catch (err) {
    console.error('Likes baseline hatası:', err)
  } finally {
    likesBaselineLoading.value = false
  }
}

async function fetchSpamAnalysis() {
  spamLoading.value = true
  spamError.value = false
  try {
    spamData.value = await api.getSpamAnalysis(accountId.value)
  } catch (err) {
    console.error('Spam analizi hatası:', err)
    spamError.value = true
  } finally {
    spamLoading.value = false
  }
}

function changeRange(range: 7 | 30 | 90) {
  selectedRange.value = range
  fetchChartData()
}

async function fetchPosts() {
  postsLoading.value = true
  try {
    posts.value = await api.getAccountPosts(accountId.value, { limit: 50 })
  } catch (err) {
    console.error('Gönderi yükleme hatası:', err instanceof Error ? err.message : err)
  } finally {
    postsLoading.value = false
  }
}

function changeFilterType(type: PostTypeFilter) {
  selectedType.value = type
}

function formatDate(isoString: string) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul'
  })
}

function baselineHeadline(data: LikesBaselineData): string {
  if (data.naiveMae <= 0) return 'Bu hesap için henüz karşılaştırılacak yeterli veri yok.'
  const ratio = data.mae / data.naiveMae
  if (data.beatsNaive) {
    if (ratio < 0.5) return 'Modelimiz bu hesapta gayet başarılı, tahminler oldukça isabetli.'
    return 'Modelimiz burada işe yarıyor, tahminler ortalamadan daha güvenilir.'
  }
  if (ratio > 3) return 'Modelimiz bu hesapta henüz güvenilir değil, sonuçları temkinli değerlendir.'
  return 'Modelimiz burada beklenen isabeti yakalayamıyor.'
}

function baselineIcon(data: LikesBaselineData): string {
  return data.beatsNaive ? '✅' : '⚠️'
}

watch(accountId, () => {
  fetchAccountDetails()
  fetchChartData()
  fetchBestTimes()
  fetchSentiment()
  fetchTopics()
  fetchLikesBaseline()
  fetchSpamAnalysis()
  fetchPosts()
}, { immediate: true })
</script>

<style scoped>
.account-detail-page { padding-bottom: 40px; }
.page-header { margin-bottom: 24px; }
.back-link {
  color: var(--brand);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
  display: inline-block;
  margin-bottom: 12px;
  transition: transform 0.2s ease;
}
.back-link:hover { transform: translateX(-4px); }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.chart-empty-note { padding: 20px 0; }

.chart-container-fixed { min-height: 240px; width: 100%; }
.besttimes-container-fixed { min-height: 220px; width: 100%; }
.trend-chart-fixed { min-height: 240px; width: 100%; }
.chart-skeleton { height: 240px; border-radius: 12px; width: 100%; }
.heatmap-skeleton { height: 220px; border-radius: 12px; width: 100%; }

.profile-header-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.profile-main-info { display: flex; align-items: center; gap: 16px; }
.avatar-circle {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--grad-brand); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; font-weight: 700;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.35);
}
.profile-title { font-size: 1.6rem; margin: 0; color: #f8fafc; }
.profile-sub { font-size: 0.85rem; color: #94a3b8; margin: 4px 0 0 0; }
.badge-source { color: var(--brand); font-weight: 600; }

.profile-stats-row { display: flex; gap: 24px; align-items: center; }
.stat-box { display: flex; flex-direction: column; }
.stat-label { font-size: 0.68rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }
.stat-val { font-size: 1.3rem; color: #f8fafc; font-weight: 700; margin-top: 2px; }
.highlight-pink { color: var(--brand); }
.highlight-purple { color: var(--violet); }

.status-dot { font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 99px; margin-top: 4px; }
.status-dot.active { background: rgba(34, 197, 94, 0.12); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
.status-dot.pending { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }

.panel-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 22px; }
.mb-6 { margin-bottom: 24px; }
.mb-4 { margin-bottom: 16px; }
.mb-3 { margin-bottom: 12px; }
.mb-2 { margin-bottom: 8px; }

.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.panel-title { font-size: 1.15rem; margin: 0; color: #f8fafc; }
.panel-sub { font-size: 0.8rem; color: #94a3b8; margin: 4px 0 0 0; }

.time-pills, .filter-pills { display: flex; gap: 6px; background: var(--background); padding: 4px; border-radius: 10px; border: 1px solid var(--border); }
.pill-btn, .filter-btn { background: transparent; border: none; color: #94a3b8; padding: 6px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.pill-btn.active, .filter-btn.active { background: var(--brand); color: #fff; box-shadow: 0 2px 10px rgba(236, 72, 153, 0.4); }

.controls-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.select-input { background: var(--background); border: 1px solid var(--border-strong); color: #f8fafc; padding: 8px 12px; border-radius: 10px; font-size: 0.8rem; outline: none; cursor: pointer; }
.select-input.w-full { width: 100%; }

/* SENTIMENT STYLES */
.sentiment-bar-wrapper { margin-top: 12px; }
.sentiment-bar { height: 28px; width: 100%; border-radius: 99px; overflow: hidden; display: flex; background: var(--background); }
.bar-segment { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; color: #000; transition: width 0.3s ease; }
.bar-segment.pos { background: #10b981; }
.bar-segment.neu { background: #f59e0b; }
.bar-segment.neg { background: #f43f5e; color: #fff; }

.sentiment-legend { display: flex; gap: 20px; justify-content: center; margin-top: 10px; font-size: 0.8rem; color: #94a3b8; }
.sentiment-legend .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.sentiment-legend .dot.pos { background: #10b981; }
.sentiment-legend .dot.neu { background: #f59e0b; }
.sentiment-legend .dot.neg { background: #f43f5e; }

.sentiment-total-note { text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 10px; }

.flex-between { display: flex; justify-content: space-between; align-items: center; }
.sub-heading { font-size: 0.95rem; margin: 0; color: #f8fafc; }

.comments-list { display: flex; flex-direction: column; gap: 10px; }
.comment-item { background: var(--background); border: 1px solid var(--border); padding: 12px 16px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
.comment-main { flex: 1; padding-right: 12px; }
.comment-author { font-size: 0.8rem; font-weight: 700; color: var(--brand); }
.comment-text { font-size: 0.85rem; color: #f8fafc; margin: 2px 0 0 0; }
.comment-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.badge-sentiment { font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
.badge-sentiment.positive { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.badge-sentiment.neutral { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.badge-sentiment.negative { background: rgba(244, 63, 94, 0.15); color: #f43f5e; }
.comment-date { font-size: 0.7rem; color: #94a3b8; }

.trend-section { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); }

/* LIKES BASELINE & PREDICT LIKES STYLES */
.baseline-card { background: var(--background); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; }
.baseline-card.good { border-color: rgba(16, 185, 129, 0.35); }
.baseline-main { display: flex; align-items: center; gap: 14px; }
.baseline-icon { font-size: 1.6rem; }
.baseline-title { font-size: 0.9rem; color: #f8fafc; margin: 0; }
.baseline-sub { font-size: 0.75rem; color: #94a3b8; margin: 4px 0 0 0; }
.baseline-warning { font-size: 0.75rem; color: #f59e0b; margin: 10px 0 0 0; }

.predict-form { display: flex; flex-direction: column; gap: 16px; }
.predict-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
@media (max-width: 768px) { .predict-row { grid-template-columns: 1fr; } }
.predict-input-group { display: flex; flex-direction: column; gap: 6px; }
.predict-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; color: #94a3b8; }
.predict-textarea {
  width: 100%;
  background: var(--background);
  border: 1px solid var(--border-strong);
  color: #f8fafc;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.85rem;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease;
}
.predict-textarea:focus { border-color: var(--brand); }
.predict-actions { display: flex; justify-content: flex-start; }

.predict-result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 24px;
  background: radial-gradient(circle at 50% 0%, rgba(236, 72, 153, 0.15) 0%, rgba(15, 17, 26, 0.9) 70%);
  border-radius: 14px;
  border: 1.5px solid rgba(236, 72, 153, 0.35);
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.12);
  margin-top: 6px;
}
.predict-result-icon { font-size: 1.8rem; }
.predict-result-label { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; color: var(--brand); }
.predict-result-value { font-size: 2.6rem; font-weight: 700; color: #f8fafc; line-height: 1; margin: 4px 0; }
.predict-result-sub { font-size: 0.75rem; color: #94a3b8; }

.submit-btn {
  background: var(--grad-brand, linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%));
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3);
}
.submit-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.spam-summary-note { font-size: 0.85rem; color: #f59e0b; font-weight: 600; }
.mt-4 { margin-top: 16px; }

/* TOPIC ANALYSIS STYLES */
.topics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 850px) { .topics-grid { grid-template-columns: 1fr; } }
.word-cloud-box { background: var(--background); border: 1px solid var(--border); padding: 14px; border-radius: 12px; }
.word-cloud-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.word-tag-btn { background: var(--surface); border: 1px solid var(--border); color: #f8fafc; padding: 3px 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.word-tag-btn:hover { border-color: var(--brand); color: var(--brand); }
.topic-items-list { display: flex; flex-direction: column; gap: 8px; }
.topic-card-item { cursor: pointer; transition: all 0.2s ease; }
.topic-card-item:hover, .topic-card-item.active { border-color: var(--brand); background: rgba(236, 72, 153, 0.05); }
.topic-info { display: flex; flex-direction: column; gap: 4px; }
.topic-title { font-weight: 700; font-size: 0.9rem; color: #f8fafc; }
.topic-keywords { display: flex; gap: 4px; flex-wrap: wrap; }
.kw-tag { font-size: 0.7rem; color: #94a3b8; }

.post-sentiment-item { align-items: center; }
.post-sentiment-main { flex: 1; padding-right: 16px; min-width: 0; }
.mini-sentiment-bar { display: flex; height: 6px; border-radius: 99px; overflow: hidden; margin: 6px 0; background: var(--border); width: 100%; max-width: 320px; }
.mini-seg.pos { background: #10b981; }
.mini-seg.neu { background: #f59e0b; }
.mini-seg.neg { background: #f43f5e; }
.post-comment-count { font-size: 0.7rem; color: #94a3b8; }

.sentiment-reason-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  background: rgba(236, 72, 153, 0.08);
  border: 1px solid rgba(236, 72, 153, 0.2);
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  line-height: 1.3;
}
.reason-icon { font-size: 0.75rem; }
.reason-label { color: #94a3b8; font-weight: 600; }
.reason-words { color: #f8fafc; font-weight: 700; }

.posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; margin-top: 16px; }
.post-card { background: var(--background); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: transform 0.25s ease, border-color 0.25s ease; }
.post-card:hover { transform: translateY(-3px); border-color: rgba(236, 72, 153, 0.4); }

.thumb-wrap { position: relative; width: 100%; height: 170px; }
.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.4rem;
  opacity: 0.35;
  background: var(--background);
}
.thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
.type-badge { position: absolute; top: 10px; right: 10px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); }

.post-body { padding: 14px; }
.post-caption { font-size: 0.82rem; color: #f8fafc; line-height: 1.4; margin: 0 0 8px 0; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.post-date { font-size: 0.72rem; color: #94a3b8; display: block; margin-bottom: 12px; }

.post-metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border); }
.metric-item { display: flex; flex-direction: column; }
.m-lbl { font-size: 0.62rem; font-weight: 700; color: #94a3b8; }
.m-val { font-size: 0.85rem; font-weight: 700; color: #f8fafc; margin-top: 2px; }

.header-skeleton { height: 90px; border-radius: var(--radius-card); }
.post-skeleton { height: 260px; border-radius: 14px; }
</style>