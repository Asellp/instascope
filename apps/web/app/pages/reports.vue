<!-- apps/web/app/pages/reports.vue -->
<template>
  <div class="reports-page">

    <!-- YAZDIRMA / PDF ÇIKTISINDA GÖRÜNECEK BAŞLIK -->
    <div class="print-only-header">
      <div class="print-logo-row">
        <div class="brand-badge-print font-serif-display">InstaScope</div>
        <span class="print-tag">Performans & AI Analiz Raporu</span>
      </div>
      <div class="print-meta-row">
        <span><strong>Oluşturulma Tarihi:</strong> {{ formattedToday }}</span>
        <span><strong>Hesap:</strong> {{ selectedAccountLabel }}</span>
        <span><strong>Kapsam:</strong> {{ selectedRangeLabel }}</span>
      </div>
    </div>

    <!-- EKRAN ÜST BAŞLIĞI VE AKSİYONLAR (PDF'TE GİZLENİR) -->
    <div class="page-header no-print">
      <div>
        <h1 class="page-title font-serif-display">Raporlar</h1>
        <p class="page-sub">Seçilen hesap ve tarih aralığı için gerçek verilerle özet performans raporu.</p>
      </div>

      <div class="header-actions">
        <button class="btn-secondary-action" :disabled="loading" aria-label="Rapor verilerini yenile" @click="fetchReportsData">
          <span class="icon" aria-hidden="true">🔄</span> Yenile
        </button>
        <button class="btn-primary-grad" :disabled="loading || fetchError || !targetAccounts.length" aria-label="Rapor oluştur ve PDF indir" @click="generateAndExportPDF">
          <span class="icon" aria-hidden="true">📄</span> Rapor Oluştur & PDF İndir
        </button>
      </div>
    </div>

    <!-- FİLTRE PANELİ -->
    <div class="filter-card-glow no-print">
      <div class="filter-left">
        <div class="filter-label-badge">
          <span class="filter-icon" aria-hidden="true">👤</span>
          <span class="filter-label-text">HESAP SEÇİMİ</span>
        </div>
        <div class="custom-select-wrapper">
          <label for="account-select-reports" class="sr-only">Rapor İçin Hesap Seçin</label>
          <select id="account-select-reports" v-model="selectedAccountId" aria-label="Rapor için hesap seçin" class="custom-select" @change="fetchReportsData">
            <option value="all">🌐 Tüm Takip Edilen Hesaplar</option>
            <option v-for="acc in accountsList" :key="acc.id" :value="acc.id">
              📸 @{{ acc.igUsername || acc.name }}
            </option>
          </select>
          <span class="select-arrow" aria-hidden="true">▾</span>
        </div>
      </div>

      <div class="filter-right">
        <div class="filter-label-badge">
          <span class="filter-icon" aria-hidden="true">📅</span>
          <span class="filter-label-text">TARİH ARALIĞI</span>
        </div>
        <div class="time-pills-neon">
          <button
            v-for="range in rangeOptions"
            :key="range.val"
            :class="['pill-btn-neon', { active: selectedRange === range.val }]"
            :aria-label="`Tarih aralığı: ${range.label}`"
            @click="changeRange(range.val)"
          >
            {{ range.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- YÜKLENİYOR (SKELETON) -->
    <template v-if="loading">
      <div class="skeleton-box hero-skeleton mb-6"></div>
      <div class="reports-grid-skeleton mb-6">
        <div v-for="n in 4" :key="n" class="skeleton-box stat-skeleton"></div>
      </div>
      <div class="skeleton-box chart-skeleton mb-6"></div>
      <div class="reports-list-card">
        <div class="skeleton-line w-32 h-5 mb-4"></div>
        <div v-for="n in 3" :key="n" class="skeleton-report-item">
          <div class="skeleton-box circle-42"></div>
          <div class="skeleton-details">
            <div class="skeleton-line w-48 h-4 mb-2"></div>
            <div class="skeleton-line w-32 h-3"></div>
          </div>
          <div class="skeleton-line w-16 h-8 rounded-pill"></div>
        </div>
      </div>
    </template>

    <!-- SUNUCU / AĞ HATASI -->
    <div v-else-if="fetchError" class="reports-list-card">
      <AppEmptyState
        type="error"
        title="Rapor verileri yüklenemedi"
        description="Sunucuyla iletişim kurulurken bir sorun oluştu. Bağlantınızı kontrol edip tekrar deneyin."
        action-label="Tekrar dene"
        @action="fetchReportsData"
      />
    </div>

    <!-- HİÇ HESAP TAKİP EDİLMİYORSA -->
    <div v-else-if="!targetAccounts.length" class="reports-list-card">
      <AppEmptyState
        title="Rapor oluşturmak için önce bir hesap ekleyin"
        description="Henüz takip edilen bir hesap yok. Rapor içeriği, takip ettiğiniz hesapların gerçek verilerinden oluşturulur."
        action-label="+ Hesap Ekle"
        @action="navigateTo('/accounts')"
      />
    </div>

    <!-- CANLI, GERÇEK VERİYLE RAPOR İÇERİĞİ -->
    <template v-else>
      <!-- ÖNE ÇIKAN HERO ÖZET -->
      <div class="hero-report-card">
        <div class="hero-content">
          <span class="hero-pill">Yönetici Özeti · {{ selectedRangeLabel }}</span>
          <h2 class="hero-title font-serif-display">Performans & AI Büyüme Raporu</h2>
          <p class="hero-desc">
            Seçilen dönemde <strong>{{ activeAccountCount }}</strong> hesap üzerinden
            <strong>{{ totalPostsCount }}</strong> gönderi analiz edildi. Ortalama etkileşim oranı
            <strong>%{{ avgEngagementRate }}</strong> olarak gerçekleşti.
            <template v-if="sentimentData.totalAnalyzedComments > 0">
              Analiz edilen yorumların <strong>%{{ filteredDistribution.positive }}</strong>'i pozitif duygu taşıyor.
            </template>
            <template v-if="peakSlotLabel">
              Paylaşımlarda en yüksek verim <strong>{{ peakSlotLabel }}</strong> zaman diliminde sağlandı.
            </template>
            <template v-if="likesBaselineData">
              <span class="hero-extra-note">🎯 <strong>AI Tahmin Güveni:</strong> {{ likesBaselineInsightText }}</span>
            </template>
          </p>
        </div>

        <div class="hero-actions no-print">
          <button class="btn-pdf-hero" aria-label="PDF indir ve kaydet" @click="generateAndExportPDF">
            <span class="icon" aria-hidden="true">↓</span> PDF İndir & Kaydet
          </button>
        </div>
      </div>

      <!-- RAPOR METRİK ÖZET KARTLARI -->
      <div class="report-kpi-grid mb-6">
        <div class="kpi-box border-pink">
          <span class="kpi-title">ANALİZ EDİLEN GÖNDERİ</span>
          <span class="kpi-num font-serif-display">{{ totalPostsCount }}</span>
          <span class="kpi-sub">Son {{ selectedRange }} günlük içerik</span>
        </div>

        <div class="kpi-box border-purple">
          <span class="kpi-title">ORTALAMA ETKİLEŞİM</span>
          <span class="kpi-num font-serif-display highlight-pink">%{{ avgEngagementRate }}</span>
          <span class="kpi-sub">Beğeni & Yorum Oranı</span>
        </div>

        <div class="kpi-box border-green">
          <span class="kpi-title">POZİTİF DUYGU ORANI</span>
          <span class="kpi-num font-serif-display highlight-green">%{{ filteredDistribution.positive }}</span>
          <span class="kpi-sub">{{ sentimentData.totalAnalyzedComments }} yorum analiz edildi</span>
        </div>

        <div class="kpi-box border-cyan">
          <span class="kpi-title">🛡️ TOPLULUK GÜVENLİĞİ</span>
          <span class="kpi-num font-serif-display highlight-cyan">%{{ cleanCommentsPercentage }}</span>
          <span class="kpi-sub">
            <template v-if="spamSummaryData.totalComments > 0">
              Temiz yorum oranı (%{{ spamSummaryData.flaggedPercentage.toFixed(1) }} şüpheli)
            </template>
            <template v-else>
              Yorumlar temiz görünüyor
            </template>
          </span>
        </div>
      </div>

      <!-- TAKİPÇİ BÜYÜMESİ + İÇERİK KARIŞIMI -->
      <div class="grid-2-1 mb-6">
        <div class="panel-card">
          <h3 class="panel-title font-serif-display">Takipçi Büyümesi</h3>
          <p class="panel-sub">{{ selectedAccountLabel }} · son {{ selectedRange }} gün</p>

          <div v-if="followerSeries.length === 0" class="chart-empty-note">
            <AppEmptyState
              title="Takipçi verisi yok"
              description="Bu hesap için henüz büyüme geçmişi kaydedilmedi."
            />
          </div>
          <div v-else class="chart-container-fixed">
            <ClientOnly>
              <LazyLineChart
                v-if="isMounted"
                :data="followerSeries"
                color="#ec4899"
                height="220px"
                :show-axis="true"
                :value-formatter="(v) => `${v.toLocaleString('tr-TR')} takipçi`"
              />
              <div v-else class="skeleton-box" style="height: 220px; border-radius: 12px;"></div>
            </ClientOnly>
          </div>
        </div>

        <div class="panel-card">
          <h3 class="panel-title font-serif-display">İçerik Karışımı</h3>
          <p class="panel-sub">Son {{ selectedRange }} gün gönderileri</p>

          <div v-if="filteredPosts.length === 0" class="chart-empty-note">
            <AppEmptyState
              title="Gönderi verisi yok"
              description="Seçilen aralıkta gönderi bulunamadı."
            />
          </div>
          <template v-else>
            <div class="donut-wrapper">
              <ClientOnly>
                <LazyDonutChart
                  v-if="isMounted"
                  :slices="contentMix"
                  height="170px"
                  :center-value="String(filteredPosts.length)"
                  center-label="GÖNDERİ"
                />
                <div v-else class="skeleton-box" style="height: 170px; border-radius: 50%;"></div>
              </ClientOnly>
            </div>
            <div class="legend-list">
              <div v-for="slice in contentMix" :key="slice.label" class="legend-item">
                <span class="dot" :style="{ background: slice.color }"></span>
                {{ slice.label }} <span class="val">{{ slice.value }}%</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- İÇERİK TİPİNE GÖRE ETKİLEŞİM -->
      <div class="panel-card mb-6">
        <h3 class="panel-title font-serif-display">İçerik Tipine Göre Etkileşim</h3>
        <p class="panel-sub">Son {{ selectedRange }} gün ortalama etkileşim oranı (%)</p>

        <div v-if="filteredPosts.length === 0" class="chart-empty-note">
          <AppEmptyState
            title="Etkileşim verisi yok"
            description="Seçilen aralıkta analiz edilecek gönderi bulunamadı."
          />
        </div>
        <div v-else class="chart-container-fixed">
          <ClientOnly>
            <LazyBarChart
              v-if="isMounted"
              :categories="contentPerf.map(c => c.label)"
              :data="contentPerf.map(c => c.avgEngagement)"
              :colors="['#ec4899', '#06b6d4', '#a855f7']"
              height="220px"
              :value-formatter="(v) => `%${v}`"
            />
            <div v-else class="skeleton-box" style="height: 220px; border-radius: 12px;"></div>
          </ClientOnly>
        </div>
      </div>

      <!-- DUYGU ANALİZİ -->
      <div class="panel-card mb-6">
        <h3 class="panel-title font-serif-display">🤖 Yapay Zeka Duygu Analizi</h3>
        <p class="panel-sub">{{ selectedAccountLabel }} · son {{ selectedRange }} gün yorumları</p>

        <AppEmptyState
          v-if="sentimentData.totalAnalyzedComments === 0"
          title="Duygu analizi verisi yok"
          description="Seçilen hesap(lar) için henüz analiz edilmiş yorum yok."
        />
        <template v-else>
          <div class="sentiment-bar-print mb-4">
            <div class="seg pos" :style="{ width: `${filteredDistribution.positive}%` }">%{{ filteredDistribution.positive }} Pozitif</div>
            <div class="seg neu" :style="{ width: `${filteredDistribution.neutral}%` }">%{{ filteredDistribution.neutral }} Nötr</div>
            <div class="seg neg" :style="{ width: `${filteredDistribution.negative}%` }">%{{ filteredDistribution.negative }} Negatif</div>
          </div>

          <div class="trend-section">
            <h4 class="sub-heading mb-3">📈 Zaman İçinde Duygu Trendi</h4>
            <AppEmptyState
              v-if="sentimentTrend.length < 2"
              title="Trend için yeterli veri yok"
              description="En az iki farklı tarihte analiz edilmiş gönderi gerekiyor."
            />
            <div v-else class="chart-container-fixed">
              <ClientOnly>
                <LazySentimentTrendChart v-if="isMounted" :data="sentimentTrend" />
                <div v-else class="skeleton-box" style="height: 240px; border-radius: 12px;"></div>
              </ClientOnly>
            </div>
          </div>
        </template>
      </div>

      <!-- KONU ANALİZİ -->
      <div class="panel-card mb-6">
        <h3 class="panel-title font-serif-display">📌 Konu Analizi (BERTopic)</h3>
        <p class="panel-sub">{{ primaryAccountLabel }} · öne çıkan temalar ve anahtar kelimeler</p>

        <AppEmptyState
          v-if="!topicsData || !topicsData.topics || topicsData.topics.length === 0"
          title="Konu analizi verisi yok"
          description="Seçili hesap için henüz konu modelleme verisi işlenmedi."
        />
        <template v-else>
          <div class="keyword-tags-row mb-4">
            <span v-for="kw in allKeywords" :key="kw" class="kw-tag-pill">#{{ kw }}</span>
          </div>

          <div class="topics-summary-list">
            <div v-for="topic in topicsData.topics.slice(0, 5)" :key="topic.topicId" class="topic-summary-item">
              <div class="topic-summary-head">
                <span class="topic-summary-name">{{ topic.topicName }}</span>
                <span class="badge-source">{{ topic.count }} yorum</span>
              </div>
              <p v-if="topic.sampleComments?.[0]" class="topic-summary-comment">
                "{{ topic.sampleComments[0].text }}"
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- EN İYİ PAYLAŞIM ZAMANI (gerçek ısı haritası) -->
      <div class="panel-card mb-6">
        <div class="chart-container-fixed">
          <ClientOnly>
            <LazyBestTimesChart
              v-if="isMounted"
              :heatmap-data="bestTimesData"
              :loading="false"
              :error="bestTimesError"
              @retry="fetchReportsData"
            />
            <div v-else class="skeleton-box" style="height: 220px; border-radius: 12px;"></div>
          </ClientOnly>
        </div>
      </div>

      <!-- EN YÜKSEK ETKİLEŞİMLİ GÖNDERİLER -->
      <div class="panel-card mb-6">
        <h3 class="panel-title font-serif-display">🔥 En Yüksek Etkileşimli Gönderiler</h3>
        <p class="panel-sub">Son {{ selectedRange }} gün · {{ selectedAccountLabel }}</p>

        <AppEmptyState
          v-if="topPosts.length === 0"
          title="Gönderi bulunamadı"
          description="Seçilen aralıkta gösterilecek gönderi yok."
        />
        <div v-else class="print-posts-grid">
          <div v-for="post in topPosts" :key="post.id" class="print-post-card">
            <div class="post-card-top">
              <span class="badge-post-type">{{ post.type.toUpperCase() }}</span>
              <span class="post-date-text">{{ formatDate(post.postedAt) }}</span>
            </div>
            <p class="post-caption-text">{{ post.caption || 'Başlıksız gönderi' }}</p>
            <div class="post-stats-strip">
              <span>❤️ {{ post.metrics.likes.toLocaleString('tr-TR') }}</span>
              <span>💬 {{ post.metrics.commentsCount.toLocaleString('tr-TR') }}</span>
              <span class="highlight-pink">⚡ %{{ post.metrics.engagementRate }} ER</span>
            </div>
          </div>
        </div>
      </div>

      <!-- GEÇMİŞ RAPORLAR VE ARŞİV LİSTESİ -->
      <div class="reports-list-card no-print">
        <div class="list-card-header">
          <h3 class="list-title font-serif-display">Geçmiş Raporlar & İndirme Arşivi</h3>
          <span class="report-count-tag">{{ pastReports.length }} Rapor Mevcut</span>
        </div>

        <div v-if="pastReports.length === 0" class="empty-wrap">
          <AppEmptyState
            title="Henüz geçmiş rapor yok"
            description="Yukarıdaki 'Rapor Oluştur & PDF İndir' butonuna basarak ilk raporunuzu oluşturabilirsiniz."
          />
        </div>

        <div v-else class="reports-list">
          <div v-for="report in pastReports" :key="report.id" class="report-item">
            <div class="report-icon-box" aria-hidden="true"><span>📄</span></div>
            <div class="report-details">
              <h4 class="report-name">{{ report.title }}</h4>
              <div class="report-meta">
                <span class="meta-date">📅 {{ report.date }}</span>
                <span class="meta-accounts">📈 {{ report.accounts }}</span>
                <span :class="['type-tag', report.type === 'Otomatik' ? 'auto' : 'custom']">{{ report.type }}</span>
              </div>
            </div>
            <div class="report-item-actions">
              <button class="btn-download" :aria-label="`${report.title} metin raporunu indir`" @click="downloadTextReport(report)">
                <span class="icon" aria-hidden="true">💾</span> Metin
              </button>
              <button class="btn-download primary" :aria-label="`${report.title} PDF raporunu gör ve yazdır`" @click="handlePrint">
                <span class="icon" aria-hidden="true">🖨️</span> PDF Gör
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div class="print-only-footer">
      <p>Bu rapor InstaScope Sosyal Medya Analitik Platformu tarafından oluşturulmuştur. © {{ new Date().getFullYear() }} InstaScope Labs.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import auth from '~/middleware/auth'
import { useApi } from '~/composables/useApi'
import { deriveContentMix, deriveContentPerformance, type SentimentData, type TopicsData, type LikesBaselineData, type SpamData } from '~/utils/apiMappers'
import type { Report, Account, PostItem, TimeSeriesPoint, ContentMixSlice, ContentTypePerformance, BestTimeSlot } from '~/utils/mockData'
import type { SentimentTrendPoint } from '~/components/charts/SentimentTrendChart.vue'

definePageMeta({
  middleware: auth
})

const api = useApi()

const pastReports = ref<Report[]>([])
const accountsList = ref<Account[]>([])
const postsList = ref<PostItem[]>([])
const followerSeries = ref<TimeSeriesPoint[]>([])
const bestTimesData = ref<BestTimeSlot[]>([])
const topicsData = ref<TopicsData | null>(null)
const sentimentData = ref<SentimentData>({
  distribution: { positive: 0, neutral: 0, negative: 0 },
  totalAnalyzedComments: 0,
  posts: []
})
const likesBaselineData = ref<LikesBaselineData | null>(null)
const spamSummaryData = ref<SpamData>({
  totalComments: 0,
  totalFlagged: 0,
  flaggedPercentage: 0,
  flaggedComments: []
})

const loading = ref(true)
const fetchError = ref(false)
const bestTimesError = ref(false)

const isMounted = ref(false)

const selectedAccountId = ref('all')
const selectedRange = ref<7 | 30 | 90>(30)

const rangeOptions = [
  { val: 7, label: 'Son 7 Gün' },
  { val: 30, label: 'Son 30 Gün' },
  { val: 90, label: 'Son 90 Gün' }
] as const

const formattedToday = computed(() =>
  new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
)

const selectedRangeLabel = computed(() =>
  selectedRange.value === 7 ? 'Son 7 Gün' : selectedRange.value === 90 ? 'Son 90 Gün' : 'Son 30 Gün'
)

const targetAccounts = computed(() => {
  if (selectedAccountId.value === 'all') return accountsList.value
  return accountsList.value.filter(a => String(a.id) === String(selectedAccountId.value))
})

const primaryAccount = computed(() => targetAccounts.value[0] ?? null)

const selectedAccountLabel = computed(() => {
  if (selectedAccountId.value === 'all') return 'Tüm Hesaplar'
  return primaryAccount.value ? `@${primaryAccount.value.igUsername || primaryAccount.value.name}` : 'Seçili Hesap'
})

const primaryAccountLabel = computed(() =>
  primaryAccount.value ? `@${primaryAccount.value.igUsername || primaryAccount.value.name}` : 'Seçili Hesap'
)

const activeAccountCount = computed(() => targetAccounts.value.length)

function mergeSentimentData(list: SentimentData[]): SentimentData {
  const posts = list.flatMap(s => s.posts)
  const totalAnalyzedComments = posts.reduce((sum, p) => sum + p.totalAnalyzedComments, 0)
  const posSum = posts.reduce((sum, p) => sum + p.positive.count, 0)
  const neuSum = posts.reduce((sum, p) => sum + p.neutral.count, 0)
  const negSum = posts.reduce((sum, p) => sum + p.negative.count, 0)
  return {
    distribution: totalAnalyzedComments > 0
      ? {
          positive: Math.round((posSum / totalAnalyzedComments) * 100),
          neutral: Math.round((neuSum / totalAnalyzedComments) * 100),
          negative: Math.round((negSum / totalAnalyzedComments) * 100)
        }
      : { positive: 0, neutral: 0, negative: 0 },
    totalAnalyzedComments,
    posts
  }
}

const postDateById = computed(() => {
  const map = new Map<string, string>()
  postsList.value.forEach(p => map.set(p.id, p.postedAt))
  return map
})

const filteredPosts = computed(() => {
  const cutoff = Date.now() - selectedRange.value * 24 * 60 * 60 * 1000
  return postsList.value.filter(p => new Date(p.postedAt).getTime() >= cutoff)
})

const filteredSentimentPosts = computed(() => {
  const cutoff = Date.now() - selectedRange.value * 24 * 60 * 60 * 1000
  return sentimentData.value.posts.filter(p => {
    const iso = postDateById.value.get(p.postId)
    if (!iso) return true
    return new Date(iso).getTime() >= cutoff
  })
})

const filteredDistribution = computed(() => {
  const posts = filteredSentimentPosts.value
  const total = posts.reduce((s, p) => s + p.totalAnalyzedComments, 0)
  if (!total) return { positive: 0, neutral: 0, negative: 0 }
  const pos = posts.reduce((s, p) => s + p.positive.count, 0)
  const neu = posts.reduce((s, p) => s + p.neutral.count, 0)
  const neg = posts.reduce((s, p) => s + p.negative.count, 0)
  return {
    positive: Math.round((pos / total) * 100),
    neutral: Math.round((neu / total) * 100),
    negative: Math.round((neg / total) * 100)
  }
})

const sentimentTrend = computed<SentimentTrendPoint[]>(() => {
  const byDate = new Map<string, { pos: number; neu: number; neg: number; total: number }>()
  sentimentData.value.posts.forEach(p => {
    const iso = postDateById.value.get(p.postId)
    if (!iso) return
    const date = iso.slice(0, 10)
    if (!byDate.has(date)) byDate.set(date, { pos: 0, neu: 0, neg: 0, total: 0 })
    const e = byDate.get(date)!
    e.pos += p.positive.count
    e.neu += p.neutral.count
    e.neg += p.negative.count
    e.total += p.totalAnalyzedComments
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

const contentMix = computed<ContentMixSlice[]>(() => deriveContentMix(filteredPosts.value))
const contentPerf = computed<ContentTypePerformance[]>(() => deriveContentPerformance(filteredPosts.value))

const totalPostsCount = computed(() => filteredPosts.value.length)

const avgEngagementRate = computed(() => {
  if (!filteredPosts.value.length) return '0.0'
  const sum = filteredPosts.value.reduce((acc, p) => acc + (p.metrics?.engagementRate ?? 0), 0)
  return (sum / filteredPosts.value.length).toFixed(1)
})

const cleanCommentsPercentage = computed(() => {
  if (!spamSummaryData.value.totalComments) return '100'
  const cleanRatio = Math.max(0, 100 - spamSummaryData.value.flaggedPercentage)
  return cleanRatio.toFixed(0)
})

const likesBaselineInsightText = computed(() => {
  if (!likesBaselineData.value) return 'Tahminleme modeli inceleniyor.'
  if (likesBaselineData.value.beatsNaive) {
    return 'Beğeni tahminleme modeli bu hesap verileri üzerinde yüksek isabetle çalışıyor.'
  }
  return 'Beğeni tahminleme modeli bu hesap için daha fazla veriye ihtiyaç duyuyor.'
})

const topPosts = computed(() =>
  [...filteredPosts.value].sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate).slice(0, 4)
)

const allKeywords = computed(() => {
  if (!topicsData.value?.topics) return []
  const seen = new Set<string>()
  const list: string[] = []
  topicsData.value.topics.forEach(t => {
    (t.keywords || []).forEach(kw => {
      if (!seen.has(kw)) {
        seen.add(kw)
        list.push(kw)
      }
    })
  })
  return list.slice(0, 12)
})

const DAY_LABELS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

const peakSlotLabel = computed(() => {
  const withData = bestTimesData.value.filter(s => s.sampleSize > 0 && s.avgEngagement !== null)
  if (!withData.length) return null
  const top = [...withData].sort((a, b) => (b.avgEngagement ?? 0) - (a.avgEngagement ?? 0))[0]
  const dayLabel = DAY_LABELS_FULL[top.dayOfWeek - 1] ?? 'Bilinmiyor'
  return `${dayLabel} ${top.hour}:00`
})

async function fetchReportsData() {
  loading.value = true
  fetchError.value = false
  bestTimesError.value = false

  try {
    const [reportsRes, accsRes] = await Promise.all([
      api.getReports().catch(() => []),
      api.getAccounts()
    ])
    pastReports.value = reportsRes
    accountsList.value = accsRes

    const targets = targetAccounts.value
    if (!targets.length) {
      postsList.value = []
      followerSeries.value = []
      bestTimesData.value = []
      topicsData.value = null
      sentimentData.value = { distribution: { positive: 0, neutral: 0, negative: 0 }, totalAnalyzedComments: 0, posts: [] }
      likesBaselineData.value = null
      spamSummaryData.value = { totalComments: 0, totalFlagged: 0, flaggedPercentage: 0, flaggedComments: [] }
      return
    }

    const [postsPerAccount, sentimentPerAccount, spamPerAccount] = await Promise.all([
      Promise.all(targets.map(acc => api.getAccountPosts(acc.id, { sort: 'date', type: 'all', limit: 50 }).catch(() => []))),
      Promise.all(targets.map(acc => api.getSentimentData(acc.id).catch(() => null))),
      Promise.all(targets.map(acc => api.getSpamAnalysis(acc.id).catch(() => null)))
    ])

    postsList.value = postsPerAccount.flat()
    sentimentData.value = mergeSentimentData(sentimentPerAccount.filter((s): s is SentimentData => !!s))

    const validSpams = spamPerAccount.filter((s): s is SpamData => !!s)
    if (validSpams.length > 0) {
      const totComments = validSpams.reduce((acc, s) => acc + s.totalComments, 0)
      const totFlagged = validSpams.reduce((acc, s) => acc + s.totalFlagged, 0)
      spamSummaryData.value = {
        totalComments: totComments,
        totalFlagged: totFlagged,
        flaggedPercentage: totComments > 0 ? (totFlagged / totComments) * 100 : 0,
        flaggedComments: []
      }
    } else {
      spamSummaryData.value = { totalComments: 0, totalFlagged: 0, flaggedPercentage: 0, flaggedComments: [] }
    }

    const primaryIndex = postsPerAccount.findIndex(p => p.length > 0)
    const primary = targets[primaryIndex !== -1 ? primaryIndex : 0]

    const [seriesRes, bestTimesRes, topicsRes, baselineRes] = await Promise.all([
      api.getFollowerTimeseries(primary.id, selectedRange.value).catch(() => []),
      api.getBestTimes(primary.id).catch(() => { bestTimesError.value = true; return [] }),
      api.getTopics(primary.id).catch(() => null),
      api.getLikesBaseline(primary.id).catch(() => null)
    ])

    followerSeries.value = seriesRes
    bestTimesData.value = bestTimesRes
    topicsData.value = topicsRes
    likesBaselineData.value = baselineRes
  } catch (err) {
    console.error('Rapor verileri yüklenemedi:', err)
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

function changeRange(range: 7 | 30 | 90) {
  selectedRange.value = range
  fetchReportsData()
}

async function executePrintProcess() {
  const pageEl = document.querySelector('.reports-page') as HTMLElement
  if (pageEl) {
    pageEl.style.width = '760px'
    pageEl.style.maxWidth = '760px'
  }

  window.dispatchEvent(new Event('resize'))
  await new Promise((resolve) => setTimeout(resolve, 350))
  window.print()

  if (pageEl) {
    pageEl.style.width = ''
    pageEl.style.maxWidth = ''
  }
  window.dispatchEvent(new Event('resize'))
}

function generateAndExportPDF() {
  const newReportTitle = `${selectedAccountLabel.value} - ${selectedRangeLabel.value} Analizi`
  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })

  const newReport: Report = {
    id: Date.now(),
    title: newReportTitle,
    date: todayStr,
    accounts: selectedAccountLabel.value,
    type: 'Özel'
  }
  pastReports.value.unshift(newReport)

  executePrintProcess()
}

function handlePrint() {
  executePrintProcess()
}

function downloadTextReport(report: Report) {
  const textContent = `INSTASCOPE PERFORMANS RAPORU
----------------------------------------
Rapor Başlığı: ${report.title}
Tarih: ${report.date}
Hesap Kapsamı: ${report.accounts}
Rapor Tipi: ${report.type}
----------------------------------------
Oluşturulma Zamanı: ${formattedToday.value}
InstaScope Analytics Labs`

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.title.toLowerCase().replace(/\s+/g, '_')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDate(isoString: string) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(() => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => { isMounted.value = true })
  } else {
    setTimeout(() => { isMounted.value = true }, 150)
  }
  fetchReportsData()
})
</script>

<style scoped>
.reports-page { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }

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

.chart-container-fixed { min-height: 220px; width: 100%; }

.mb-6 { margin-bottom: 24px; }
.mb-4 { margin-bottom: 16px; }
.mb-3 { margin-bottom: 12px; }
.mb-2 { margin-bottom: 8px; }

.print-only-header, .print-only-footer { display: none; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 2.8rem; font-weight: 400; line-height: 1.1; color: #f8fafc; }
.page-sub { color: #94a3b8; font-size: 0.9rem; margin-top: 6px; }

.header-actions { display: flex; align-items: center; gap: 12px; }

.btn-secondary-action {
  background: var(--surface); color: #f8fafc; border: 1px solid var(--border);
  padding: 10px 18px; border-radius: 99px; font-size: 0.88rem; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;
}
.btn-secondary-action:hover { background: var(--surface-hover); }
.btn-secondary-action:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary-grad {
  background: var(--grad-brand); color: #fff; border: none; padding: 10px 22px; border-radius: 99px;
  font-size: 0.88rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3); transition: opacity 0.2s, transform 0.2s;
}
.btn-primary-grad:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
.btn-primary-grad:disabled { opacity: 0.5; cursor: not-allowed; }

.filter-card-glow {
  background: linear-gradient(180deg, var(--surface) 0%, rgba(15, 23, 42, 0.6) 100%);
  border: 1px solid rgba(236, 72, 153, 0.25); border-radius: 20px; padding: 16px 26px;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;
  box-shadow: 0 10px 30px -10px rgba(236, 72, 153, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
}
.filter-left, .filter-right { display: flex; align-items: center; gap: 14px; }
.filter-label-badge {
  display: flex; align-items: center; gap: 6px; background: rgba(236, 72, 153, 0.1);
  padding: 6px 12px; border-radius: 99px; border: 1px solid rgba(236, 72, 153, 0.2);
}
.filter-icon { font-size: 0.95rem; }
.filter-label-text { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; color: var(--brand); }
.custom-select-wrapper { position: relative; min-width: 230px; }
.custom-select {
  width: 100%; appearance: none; background: var(--background); border: 1px solid var(--border-strong);
  color: #f8fafc; padding: 9px 38px 9px 16px; border-radius: 12px; font-size: 0.85rem;
  font-weight: 700; outline: none; cursor: pointer; transition: all 0.2s ease;
}
.custom-select:focus, .custom-select:hover { border-color: var(--brand); box-shadow: 0 0 12px rgba(236, 72, 153, 0.25); }
.select-arrow { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--brand); font-size: 0.85rem; }
.time-pills-neon { display: flex; gap: 6px; background: var(--background); padding: 4px; border-radius: 14px; border: 1px solid var(--border-strong); }
.pill-btn-neon {
  background: transparent; border: none; color: #94a3b8; padding: 7px 18px; font-size: 0.8rem;
  font-weight: 700; border-radius: 10px; cursor: pointer; transition: all 0.25s ease;
}
.pill-btn-neon:hover { color: #f8fafc; }
.pill-btn-neon.active { background: var(--grad-brand); color: #ffffff; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4); }

.hero-report-card {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.92) 0%, rgba(249, 115, 22, 0.92) 100%);
  border-radius: 20px; padding: 32px 36px; display: flex; justify-content: space-between; align-items: center;
  color: #fff; box-shadow: 0 12px 32px rgba(236, 72, 153, 0.25); flex-wrap: wrap; gap: 24px;
}
.hero-content { max-width: 680px; }
.hero-pill {
  display: inline-block; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); color: #fff;
  font-size: 0.75rem; font-weight: 800; padding: 4px 14px; border-radius: 99px; margin-bottom: 12px;
}
.hero-title { font-size: 2.4rem; font-weight: 400; line-height: 1.15; color: #fff; }
.hero-desc { font-size: 0.95rem; color: rgba(255, 255, 255, 0.95); margin-top: 10px; line-height: 1.5; }
.hero-desc strong { color: #fff; font-weight: 800; }
.hero-extra-note { display: block; margin-top: 8px; font-size: 0.88rem; opacity: 0.95; }
.hero-actions { min-height: 48px; display: flex; align-items: center; }
.btn-pdf-hero {
  background: #0f111a; color: #fff; border: none; padding: 12px 24px; border-radius: 99px;
  font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: transform 0.2s ease;
}
.btn-pdf-hero:hover { transform: translateY(-2px); }

.report-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
.kpi-box { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; }
.kpi-box.border-pink { border-top: 3px solid var(--brand); }
.kpi-box.border-purple { border-top: 3px solid var(--violet); }
.kpi-box.border-green { border-top: 3px solid var(--success); }
.kpi-box.border-cyan { border-top: 3px solid #06b6d4; }
.kpi-title { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; color: #94a3b8; }
.kpi-num { font-size: 2.2rem; font-weight: 700; color: #f8fafc; margin: 6px 0; line-height: 1; }
.kpi-sub { font-size: 0.78rem; color: #94a3b8; }
.highlight-pink { color: var(--brand); }
.highlight-green { color: var(--success); }
.highlight-cyan { color: #06b6d4; }

.grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; }
.panel-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card, 16px); padding: 22px; }
.panel-title { font-size: 1.1rem; font-weight: 700; color: #f8fafc; margin: 0; }
.panel-sub { font-size: 0.78rem; color: #94a3b8; margin: 4px 0 16px 0; }
.chart-empty-note { padding: 20px 0; }

.donut-wrapper { position: relative; width: 170px; height: 170px; margin: 24px auto; }
.legend-list { display: flex; flex-direction: column; gap: 12px; margin-top: 18px; }
.legend-item { display: flex; align-items: center; font-size: 0.95rem; color: #94a3b8; }
.legend-item .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 12px; }
.legend-item .val { margin-left: auto; font-weight: 700; font-size: 0.98rem; color: #f8fafc; }

.sub-heading { font-size: 0.95rem; margin: 0; color: #f8fafc; }
.trend-section { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); }

.sentiment-bar-print {
  display: flex; height: 30px; border-radius: 99px; overflow: hidden; font-size: 0.75rem;
  font-weight: 800; color: #000; background: var(--background);
}
.sentiment-bar-print .seg { display: flex; align-items: center; justify-content: center; }
.sentiment-bar-print .seg.pos { background: #10b981; }
.sentiment-bar-print .seg.neu { background: #f59e0b; }
.sentiment-bar-print .seg.neg { background: #f43f5e; color: #fff; }

.keyword-tags-row { display: flex; flex-wrap: wrap; gap: 8px; }
.kw-tag-pill {
  background: var(--background); border: 1px solid var(--border-strong); color: var(--brand);
  font-size: 0.78rem; font-weight: 700; padding: 4px 12px; border-radius: 8px;
}
.topics-summary-list { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.topic-summary-item { background: var(--background); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; }
.topic-summary-head { display: flex; justify-content: space-between; align-items: center; }
.topic-summary-name { font-weight: 700; font-size: 0.9rem; color: #f8fafc; }
.badge-source { color: var(--brand); font-weight: 600; font-size: 0.78rem; }
.topic-summary-comment { font-size: 0.82rem; color: #94a3b8; font-style: italic; margin: 6px 0 0 0; }

.print-posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-top: 8px; }
.print-post-card { background: var(--background); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
.post-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.badge-post-type {
  font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;
  background: var(--surface); color: var(--brand); border: 1px solid var(--border);
}
.post-date-text { font-size: 0.7rem; color: #94a3b8; }
.post-caption-text {
  font-size: 0.82rem; color: #f8fafc; font-weight: 600; margin: 0 0 10px 0;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.post-stats-strip { display: flex; gap: 10px; font-size: 0.72rem; font-weight: 700; color: #94a3b8; }

.reports-list-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px 28px; }
.list-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.list-title { font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin: 0; }
.report-count-tag { font-size: 0.75rem; font-weight: 700; color: var(--brand); background: rgba(236, 72, 153, 0.1); padding: 4px 10px; border-radius: 99px; }
.reports-list { display: flex; flex-direction: column; }
.report-item { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border); }
.report-item:last-child { border-bottom: none; }
.report-icon-box {
  width: 42px; height: 42px; background: var(--background); border: 1px solid var(--border);
  border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
}
.report-details { flex: 1; }
.report-name { font-size: 0.95rem; font-weight: 700; color: #f8fafc; margin: 0; }
.report-meta { display: flex; align-items: center; gap: 14px; font-size: 0.78rem; color: #94a3b8; margin-top: 4px; }
.type-tag { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid var(--border); }
.type-tag.auto { background: rgba(255, 255, 255, 0.04); color: #f8fafc; }
.type-tag.custom { background: rgba(168, 85, 247, 0.12); color: var(--violet); border-color: rgba(168, 85, 247, 0.3); }
.report-item-actions { display: flex; gap: 8px; }
.btn-download {
  background: var(--background); border: 1px solid var(--border); color: #f8fafc; font-size: 0.78rem;
  font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  border-radius: 8px; transition: all 0.2s;
}
.btn-download:hover { border-color: var(--border-strong); }
.btn-download.primary { background: var(--surface-hover); border-color: var(--brand); color: var(--brand); }

.hero-skeleton { height: 160px; border-radius: 20px; }
.chart-skeleton { height: 260px; border-radius: 16px; }
.reports-grid-skeleton { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
.stat-skeleton { height: 100px; border-radius: 16px; }
.skeleton-report-item { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border); }
.skeleton-details { flex: 1; }
.circle-42 { width: 42px; height: 42px; border-radius: 12px; }
.skeleton-line { background: var(--border); border-radius: 4px; }
.w-16 { width: 64px; } .w-32 { width: 128px; } .w-48 { width: 192px; }
.h-3 { height: 12px; } .h-4 { height: 16px; } .h-5 { height: 20px; } .h-8 { height: 32px; }
.rounded-pill { border-radius: 99px; }

/* ==========================================================================
   MOBİL VE KÜÇÜK EKRAN UYUMLULUĞU
   ========================================================================== */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 10px;
  }

  .btn-secondary-action,
  .btn-primary-grad {
    width: 100%;
    justify-content: center;
  }

  .filter-card-glow {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 16px;
  }

  .filter-left,
  .filter-right {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 10px;
  }

  .filter-label-badge {
    align-self: flex-start;
  }

  .custom-select-wrapper {
    min-width: 100% !important;
    width: 100%;
  }

  .time-pills-neon {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .pill-btn-neon {
    flex: 1;
    text-align: center;
    padding: 8px 4px;
    font-size: 0.75rem;
  }

  .grid-2-1 {
    grid-template-columns: 1fr !important;
  }

  .hero-report-card {
    padding: 20px;
  }

  .hero-title {
    font-size: 1.75rem;
  }

  .reports-list-card {
    padding: 16px;
  }
}

/* ==========================================================================
   PRINT / PDF ÖZEL STİLLERİ
   ========================================================================== */
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }

  .no-print,
  .btn-pdf-hero,
  .report-item-actions {
    display: none !important;
  }

  .print-only-header {
    display: block !important;
    border-bottom: 2px solid #ec4899;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  .brand-badge-print {
    font-size: 2rem;
    font-weight: 800;
    color: #ec4899;
    display: inline-block;
  }

  .print-tag {
    font-size: 0.9rem;
    font-weight: 700;
    color: #4b5563;
    margin-left: 12px;
  }

  .print-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #1f2937;
    margin-top: 10px;
    background: #f3f4f6;
    padding: 8px 12px;
    border-radius: 8px;
  }

  .print-only-footer {
    display: block !important;
    margin-top: 30px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 0.72rem;
    color: #6b7280;
    text-align: center;
  }

  body, .reports-page {
    background: #ffffff !important;
    color: #111827 !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .hero-report-card {
    background: linear-gradient(135deg, #ec4899 0%, #f97316 100%) !important;
    color: #ffffff !important;
    border-radius: 16px !important;
    padding: 24px !important;
  }

  .hero-title {
    color: #ffffff !important;
    font-size: 2rem !important;
  }

  .hero-desc {
    color: #f9fafb !important;
  }

  .kpi-box,
  .panel-card,
  .topic-summary-item,
  .print-post-card {
    background: #f9fafb !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 14px !important;
    page-break-inside: avoid;
    break-inside: avoid;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .kpi-num,
  .panel-title,
  .topic-summary-name,
  .post-caption-text {
    color: #111827 !important;
  }

  .grid-2-1 {
    display: grid !important;
    grid-template-columns: 2fr 1fr !important;
    gap: 16px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .chart-wrap,
  .chart-fill,
  .chart-fill > div {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .chart-fill canvas,
  .chart-wrap svg,
  .chart-fill svg {
    width: 100% !important;
    max-width: 100% !important;
    display: block !important;
  }

  @page {
    size: A4 portrait;
    margin: 1cm;
  }
}
</style>