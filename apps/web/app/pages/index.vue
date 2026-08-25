<!-- apps/web/app/pages/index.vue -->
<template>
  <div class="dashboard-page">

    <!-- 1. HERO BANNER -->
    <div class="hero-card">
      <div class="hero-badge pulse-anim">
        <span class="pulse-dot-wrap" style="width: 8px; height: 8px; margin-right: 6px;">
          <span class="pulse-dot-ring"></span>
          <span style="width: 6px; height: 6px; background: var(--brand); border-radius: 50%;"></span>
        </span>
        Son 30 gün özeti · {{ todayLabel }}
      </div>

      <h1 v-if="chartsLoading" class="hero-title font-serif-display">
        <span class="skeleton-inline">Yükleniyor…</span>
      </h1>
      <h1 v-else class="hero-title font-serif-display">
        Bu dönem <span class="text-gradient">{{ followersDisplay }}</span> takipçi ile
        {{ totalPostsDisplay !== null ? totalPostsDisplay : '—' }} gönderi yayında.
      </h1>

      <p v-if="!chartsLoading" class="hero-desc">
        <template v-if="overview?.followerGrowth">
          Takipçi artışın <strong>{{ formatSignedPercent(overview.followerGrowth.percentChange) }}</strong> oldu.
        </template>
        <template v-if="overview">
          Ortalama etkileşim oranın <strong>%{{ overview.averageEngagementRate }}</strong>.
        </template>
        <template v-if="topPerformingLabel">
          En iyi performansı <strong>{{ topPerformingLabel }}</strong> içerikler gösterdi.
        </template>
        AI önerisine göre bir sonraki paylaşımın için en iyi zaman
        <strong>{{ peakSlotLabel || 'henüz hesaplanmadı' }}</strong>.
      </p>

      <div class="hero-footer">
        <div class="pill-group">
          <span class="pill green">● {{ accounts.length }} hesap takip ediliyor</span>
          <span class="pill blue">⚡ Otomasyon açık</span>
        </div>

        <div class="hero-actions">
          <NuxtLink to="/reports" class="btn-dark" style="text-decoration: none; display: inline-flex; align-items: center;">Rapor indir</NuxtLink>
          <NuxtLink to="/accounts" class="btn-primary-grad" style="text-decoration: none; display: inline-flex; align-items: center;">+ Hesap ekle</NuxtLink>
        </div>
      </div>
    </div>

    <!-- 2. KPI KARTLARI -->
    <div class="kpi-grid">
      <!-- Takipçi -->
      <div class="kpi-card bg-pink-tint ambient-pink">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">TAKİPÇİ</span>
            <div class="kpi-icon pink">📈</div>
          </div>
          <div v-if="chartsLoading" class="skeleton-box" style="height: 36px; width: 120px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">{{ followersDisplay }}</div>
          <div v-if="!chartsLoading && overview?.followerGrowth" :class="['kpi-sub', overview.followerGrowth.percentChange >= 0 ? 'green' : 'red']">
            {{ overview.followerGrowth.percentChange >= 0 ? '↗' : '↘' }} {{ formatSignedPercent(overview.followerGrowth.percentChange) }}
            <span class="muted">son 30 gün</span>
          </div>
          <div v-else-if="!chartsLoading" class="kpi-sub"><span class="muted">Henüz karşılaştırma verisi yok</span></div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ec4899" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path :d="sparkPath(followerSeries)" fill="url(#pinkGrad)" />
            <path :d="sparkLine(followerSeries)" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- Etkileşim Oranı -->
      <div class="kpi-card bg-purple-tint ambient-purple">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">ETKİLEŞİM ORANI</span>
            <div class="kpi-icon violet">💜</div>
          </div>
          <div v-if="chartsLoading" class="skeleton-box" style="height: 36px; width: 100px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">{{ overview ? `%${overview.averageEngagementRate}` : '—' }}</div>
          <div v-if="!chartsLoading" class="kpi-sub"><span class="muted">30 günlük ortalama</span></div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#a855f7" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path :d="sparkPath(engagementSpark)" fill="url(#purpleGrad)" />
            <path :d="sparkLine(engagementSpark)" fill="none" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- Ort. Yorum -->
      <div class="kpi-card bg-cyan-tint ambient-cyan">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">ORTALAMA YORUM</span>
            <div class="kpi-icon cyan">💬</div>
          </div>
          <div v-if="chartsLoading" class="skeleton-box" style="height: 36px; width: 80px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">{{ avgComments !== null ? avgComments : '—' }}</div>
          <div v-if="!chartsLoading" class="kpi-sub">
            <span class="muted">{{ last30DaysPosts.length }} gönderi üzerinden</span>
          </div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path :d="sparkPath(commentsSpark)" fill="url(#cyanGrad)" />
            <path :d="sparkLine(commentsSpark)" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- Erişim -->
      <div class="kpi-card bg-orange-tint ambient-orange">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">ERİŞİM</span>
            <div class="kpi-icon orange">👁️</div>
          </div>
          <div v-if="chartsLoading" class="skeleton-box" style="height: 36px; width: 110px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">{{ totalReachDisplay }}</div>
          <div v-if="!chartsLoading" class="kpi-sub">
            <span class="muted">{{ last30DaysPosts.length }} gönderi toplamı</span>
          </div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#f97316" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path :d="sparkPath(reachSpark)" fill="url(#orangeGrad)" />
            <path :d="sparkLine(reachSpark)" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 3. TAKİPÇİ BÜYÜMESİ + İÇERİK KARIŞIMI (CANLI FİLTRELİ - F3.4) -->
    <div class="grid-2-1">
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Takipçi büyümesi</h3>
            <p class="panel-sub">Son {{ selectedGrowthRange }} gün · günlük</p>
          </div>
          <div class="time-pills">
            <button
              v-for="range in [7, 30, 90] as const"
              :key="`growth-${range}`"
              :class="{ active: selectedGrowthRange === range }"
              @click="changeGrowthRange(range)"
            >
              {{ range }}g
            </button>
          </div>
        </div>

        <div v-if="!chartsLoading && followerSeries.length === 0" class="chart-empty-note">
          <AppEmptyState
            title="Takipçi verisi henüz yok"
            description="Backend, hesap büyüme geçmişini henüz kaydetmedi. Toplama süreci ilerledikçe burada görünecek."
          />
        </div>
        <LineChart
          v-else
          :data="followerSeries"
          :loading="chartsLoading"
          color="#ec4899"
          height="220px"
          :show-axis="true"
          :value-formatter="(v) => `${v.toLocaleString('tr-TR')} takipçi`"
        />

        <div class="chart-footer-stats">
          <div>
            <span class="stat-lbl">YENİ TAKİPÇİ</span>
            <span class="stat-num pink">{{ newFollowersDisplay }}</span>
          </div>
          <div>
            <span class="stat-lbl">ORT. ETKİLEŞİM</span>
            <span class="stat-num purple">{{ overview ? `%${overview.averageEngagementRate}` : '—' }}</span>
          </div>
          <div>
            <span class="stat-lbl">TOPLAM ERİŞİM</span>
            <span class="stat-num cyan">{{ totalReachDisplay }}</span>
          </div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">İçerik karışımı</h3>
            <p class="panel-sub">Son {{ selectedMixRange }} gün gönderileri</p>
          </div>
          <div class="time-pills">
            <button
              v-for="range in [7, 30, 90] as const"
              :key="`mix-${range}`"
              :class="{ active: selectedMixRange === range }"
              @click="selectedMixRange = range"
            >
              {{ range }}g
            </button>
          </div>
        </div>

        <div v-if="!chartsLoading && filteredMixPosts.length === 0" class="chart-empty-note">
          <AppEmptyState
            title="Gönderi verisi yok"
            description="Seçilen zaman aralığında analiz edilecek gönderi bulunamadı."
          />
        </div>
        <template v-else>
          <div class="donut-wrapper">
            <DonutChart
              :slices="contentMix"
              :loading="chartsLoading"
              height="170px"
              :center-value="String(filteredMixPosts.length)"
              center-label="GÖNDERİ"
            />
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

    <!-- 3.5 İÇERİK TİPİNE GÖRE ETKİLEŞİM (CANLI FİLTRELİ - F3.4) -->
    <div class="panel-card">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">İçerik tipine göre etkileşim</h3>
          <p class="panel-sub">Son {{ selectedPerfRange }} gün ortalama etkileşim oranı (%)</p>
        </div>
        <div class="time-pills">
          <button
            v-for="range in [7, 30, 90] as const"
            :key="`perf-${range}`"
            :class="{ active: selectedPerfRange === range }"
            @click="selectedPerfRange = range"
          >
            {{ range }}g
          </button>
        </div>
      </div>

      <div v-if="!chartsLoading && filteredPerfPosts.length === 0" class="chart-empty-note">
        <AppEmptyState
          title="Etkileşim verisi yok"
          description="Seçilen zaman aralığında analiz edilecek gönderi bulunamadı."
        />
      </div>
      <BarChart
        v-else
        :categories="contentPerf.map(c => c.label)"
        :data="contentPerf.map(c => c.avgEngagement)"
        :colors="['#ec4899', '#06b6d4', '#a855f7']"
        :loading="chartsLoading"
        height="220px"
        :value-formatter="(v) => `%${v}`"
      />
    </div>

    <!-- 4. EN İYİ PAYLAŞIM ZAMANI / ISI HARİTASI (BestTimesChart) -->
    <div class="panel-card">
      <BestTimesChart
        :heatmap-data="bestTimes"
        :loading="chartsLoading"
        :error="bestTimesError"
        @retry="fetchBestTimesData"
      />
    </div>

    <!-- 5. SON GÖNDERİLER TABLOSU -->
    <div class="panel-card">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Son gönderiler</h3>
          <p class="panel-sub">Etkileşime göre sıralandı</p>
        </div>
        <NuxtLink v-if="primaryAccountId" :to="`/accounts/${primaryAccountId}`" class="link-btn">Tümünü gör ↗</NuxtLink>
      </div>

      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>İçerik</th>
              <th>Tip</th>
              <th>Beğeni</th>
              <th>Yorum</th>
              <th>Etkileşim</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="chartsLoading">
              <td colspan="6" class="content-cell">Yükleniyor…</td>
            </tr>
            <tr v-else-if="recentPosts.length === 0">
              <td colspan="6" class="content-cell">Henüz gönderi verisi yok.</td>
            </tr>
            <tr v-for="post in recentPosts" :key="post.id" class="table-row" v-else>
              <td class="content-cell">
                <span class="media-icon">{{ TYPE_ICON[post.type] }}</span>
                {{ post.caption || 'Başlıksız gönderi' }}
              </td>
              <td><span :class="['type-badge', TYPE_CLASS[post.type]]">{{ TYPE_LABEL[post.type] }}</span></td>
              <td>{{ formatCompact(post.metrics.likes) }}</td>
              <td>{{ post.metrics.commentsCount }}</td>
              <td class="er-text">%{{ post.metrics.engagementRate }}</td>
              <td class="date-text">{{ formatRelative(post.postedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

import { ref, computed, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { deriveContentMix, deriveContentPerformance } from '~/utils/apiMappers'
import type { Account, TimeSeriesPoint, ContentMixSlice, ContentTypePerformance, PostItem, BestTimeSlot, AccountOverview } from '~/utils/mockData'

const api = useApi()
const accounts = ref<Account[]>([])
const loading = ref(true)

const primaryAccountId = ref<string | number | null>(null)
const overview = ref<AccountOverview | undefined>(undefined)
const followerSeries = ref<TimeSeriesPoint[]>([])
const recentPosts = ref<PostItem[]>([])
const allPosts = ref<PostItem[]>([])
const bestTimes = ref<BestTimeSlot[]>([])
const bestTimesError = ref(false)
const chartsLoading = ref(true)

// FİLTRE STATE'LERİ (F3.4)
const selectedGrowthRange = ref<7 | 30 | 90>(30)
const selectedMixRange = ref<7 | 30 | 90>(30)
const selectedPerfRange = ref<7 | 30 | 90>(30)

const TYPE_ICON: Record<PostItem['type'], string> = { reel: '🎬', image: '🖼️', carousel: '🎴' }
const TYPE_LABEL: Record<PostItem['type'], string> = { reel: 'Reel', image: 'Foto', carousel: 'Carousel' }
const TYPE_CLASS: Record<PostItem['type'], string> = { reel: 'reel', image: 'foto', carousel: 'carousel' }

const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']
const DAY_LABELS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

const todayLabel = computed(() =>
  new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
)

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function formatSignedCompact(n: number): string {
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${formatCompact(Math.abs(n))}`
}

function formatSignedPercent(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'Az önce'
  if (hours < 24) return `${hours}s önce`
  return `${Math.floor(hours / 24)}g önce`
}

const peakSlotLabel = computed(() => {
  const withData = bestTimes.value.filter(s => s.sampleSize > 0 && s.avgEngagement !== null)
  if (!withData.length) return null
  const top = [...withData].sort((a, b) => (b.avgEngagement ?? 0) - (a.avgEngagement ?? 0))[0]
  const dayLabel = DAY_LABELS_FULL[top.dayOfWeek - 1] ?? 'Perşembe' // <-- DAY_LABELS yerine DAY_LABELS_FULL
  return `${dayLabel} ${top.hour}:00`
})

// ===== FİLTREYE GÖRE DİNAMİK TÜRETİLEN GERÇEK İSTATİSTİKLER (F3.4) =====

const last30DaysPosts = computed(() => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return allPosts.value.filter(p => new Date(p.postedAt).getTime() >= cutoff)
})

const filteredMixPosts = computed(() => {
  const cutoff = Date.now() - selectedMixRange.value * 24 * 60 * 60 * 1000
  return allPosts.value.filter(p => new Date(p.postedAt).getTime() >= cutoff)
})

const filteredPerfPosts = computed(() => {
  const cutoff = Date.now() - selectedPerfRange.value * 24 * 60 * 60 * 1000
  return allPosts.value.filter(p => new Date(p.postedAt).getTime() >= cutoff)
})

const contentMix = computed<ContentMixSlice[]>(() => deriveContentMix(filteredMixPosts.value))
const contentPerf = computed<ContentTypePerformance[]>(() => deriveContentPerformance(filteredPerfPosts.value))

const avgComments = computed(() => {
  const list = last30DaysPosts.value
  if (!list.length) return null
  const total = list.reduce((sum, p) => sum + p.metrics.commentsCount, 0)
  return Math.round(total / list.length)
})

const totalReach30d = computed(() => {
  const list = last30DaysPosts.value
  if (!list.length) return null
  return list.reduce((sum, p) => sum + p.metrics.reach, 0)
})

const totalReachDisplay = computed(() =>
  totalReach30d.value !== null ? formatCompact(totalReach30d.value) : '—'
)

const followersDisplay = computed(() =>
  overview.value ? formatCompact(overview.value.followerGrowth.end) : '—'
)

const totalPostsDisplay = computed(() =>
  overview.value ? overview.value.postFrequency.totalPosts : null
)

const newFollowersDisplay = computed(() =>
  overview.value ? formatSignedCompact(overview.value.followerGrowth.absoluteChange) : '—'
)

const topPerformingLabel = computed(() => {
  if (!contentPerf.value.length) return null
  const top = [...contentPerf.value].sort((a, b) => b.avgEngagement - a.avgEngagement)[0]
  return top?.label ?? null
})

const engagementSpark = computed(() =>
  overview.value ? [{ date: '', value: overview.value.averageEngagementRate }, { date: '', value: overview.value.averageEngagementRate }] : []
)
const commentsSpark = computed(() =>
  avgComments.value !== null ? [{ date: '', value: avgComments.value }, { date: '', value: avgComments.value }] : []
)
const reachSpark = computed(() =>
  totalReach30d.value !== null ? [{ date: '', value: totalReach30d.value }, { date: '', value: totalReach30d.value }] : []
)

function sparkLine(points: TimeSeriesPoint[]): string {
  if (!points.length) return ''
  const values = points.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = 100 / Math.max(1, points.length - 1)
  return points
    .map((p, i) => {
      const x = i * step
      const y = 36 - ((p.value - min) / range) * 32
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function sparkPath(points: TimeSeriesPoint[]): string {
  const line = sparkLine(points)
  if (!line) return ''
  return `${line} L100,40 L0,40 Z`
}

async function changeGrowthRange(range: 7 | 30 | 90) {
  selectedGrowthRange.value = range
  if (!primaryAccountId.value) return
  chartsLoading.value = true
  try {
    const [series, ov] = await Promise.all([
      api.getFollowerTimeseries(primaryAccountId.value, range),
      api.getAccountOverview(primaryAccountId.value, `${range}d`)
    ])
    followerSeries.value = series
    overview.value = ov
  } catch (err) {
    console.error('Takipçi zaman serisi hatası:', err)
  } finally {
    chartsLoading.value = false
  }
}

async function pickPrimaryAccountId(accountsList: Account[]): Promise<string | number | null> {
  for (const acc of accountsList) {
    try {
      const posts = await api.getAccountPosts(acc.id, { limit: 1 })
      if (posts.length > 0) return acc.id
    } catch (err) {
      console.error(`Hesap ${acc.id} için gönderi kontrolü başarısız:`, err)
    }
  }
  return accountsList[0]?.id ?? null
}

async function fetchBestTimesData() {
  if (!primaryAccountId.value) return
  bestTimesError.value = false
  try {
    bestTimes.value = await api.getBestTimes(primaryAccountId.value)
  } catch (err) {
    console.error('Best times yükleme hatası:', err)
    bestTimesError.value = true
  }
}

onMounted(async () => {
  try {
    accounts.value = await api.getAccounts()
    const accId = await pickPrimaryAccountId(accounts.value)
    primaryAccountId.value = accId

    if (accId === null) {
      overview.value = undefined
      followerSeries.value = []
      recentPosts.value = []
      allPosts.value = []
      bestTimes.value = []
      return
    }

    const [ov, series, topPosts, fullPosts, heatmap] = await Promise.all([
      api.getAccountOverview(accId, `${selectedGrowthRange.value}d`),
      api.getFollowerTimeseries(accId, selectedGrowthRange.value),
      api.getAccountPosts(accId, { sort: 'engagement', limit: 4 }),
      api.getAccountPosts(accId, { sort: 'date', limit: 50 }),
      api.getBestTimes(accId).catch(() => { bestTimesError.value = true; return [] })
    ])

    overview.value = ov
    followerSeries.value = series
    recentPosts.value = topPosts.slice(0, 4)
    allPosts.value = fullPosts
    bestTimes.value = heatmap
  } catch (err) {
    console.error('Dashboard veri hatası:', err)
  } finally {
    loading.value = false
    chartsLoading.value = false
  }
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@keyframes softPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
}

.pulse-anim { animation: softPulse 3s infinite ease-in-out; }

.chart-empty-note { padding: 24px 0; }
.skeleton-inline { opacity: 0.4; }

/* Hero */
.hero-card {
  background: 
    radial-gradient(circle at 92% 8%, rgba(193, 53, 132, 0.28) 0%, rgba(131, 58, 180, 0.14) 40%, transparent 70%),
    radial-gradient(circle at 8% 92%, rgba(14, 165, 233, 0.1) 0%, transparent 55%),
    linear-gradient(180deg, #11131a 0%, #0a0c12 100%);
  border: 1px solid rgba(225, 48, 108, 0.25);
  border-radius: 22px;
  padding: 28px 32px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(225, 48, 108, 0.14);
  color: #f472b6;
  border: 1px solid rgba(225, 48, 108, 0.28);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 99px;
  margin-bottom: 14px;
}

.hero-title {
  font-size: 2.4rem; 
  font-weight: 400;
  line-height: 1.2;
  max-width: 780px;
  color: #ffffff;
}

.text-gradient {
  background: linear-gradient(90deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
}

.hero-desc {
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.55;
  margin-top: 12px;
  max-width: 700px;
}

.hero-desc strong {
  color: #f8fafc;
}

.highlight-pink {
  color: #ec4899;
  font-weight: 700;
}

.hero-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 26px;
  flex-wrap: wrap;
  gap: 16px;
}

.pill-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pill {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 99px;
  border: 1px solid transparent;
}

.pill.green {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.22);
}

.pill.blue {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.22);
}

.pill.amber {
  background: rgba(217, 119, 6, 0.14);
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.22);
}

.hero-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
}

.btn-dark {
  background: #090a0f;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 11px 24px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-dark:hover {
  background: #161822;
}

.btn-primary-grad {
  background: linear-gradient(90deg, #f43f5e 0%, #fb923c 100%);
  color: #ffffff;
  border: none;
  padding: 11px 24px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn-primary-grad:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

[data-theme="light"] .hero-card {
  background: 
    radial-gradient(circle at 90% 10%, rgba(244, 63, 94, 0.22) 0%, rgba(251, 146, 60, 0.18) 35%, transparent 65%),
    radial-gradient(circle at 10% 90%, rgba(56, 189, 248, 0.18) 0%, transparent 55%),
    linear-gradient(180deg, #ffffff 0%, #fdf8fa 100%);
  border: 1.5px solid rgba(225, 29, 72, 0.45);
  border-radius: 22px;
  padding: 28px 32px;
  box-shadow: 0 10px 30px rgba(225, 29, 72, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

[data-theme="light"] .hero-badge {
  background: rgba(244, 63, 94, 0.08);
  color: #e11d48;
  border-color: rgba(244, 63, 94, 0.18);
}

[data-theme="light"] .hero-title {
  color: #18181b;
}

[data-theme="light"] .hero-desc {
  color: #52525b;
}

[data-theme="light"] .hero-desc strong {
  color: #18181b;
}

[data-theme="light"] .btn-dark {
  background: #ffffff;
  color: #18181b;
  border: 1px solid #e4e4e7;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

[data-theme="light"] .btn-dark:hover {
  background: #f4f4f5;
  border-color: #d4d4d8;
}

[data-theme="light"] .pill.green {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.2);
}

[data-theme="light"] .pill.blue {
  background: rgba(56, 189, 248, 0.12);
  color: #0284c7;
  border-color: rgba(56, 189, 248, 0.2);
}

[data-theme="light"] .pill.amber {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.2);
}

/* KPI Kartları */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px !important;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-4px);
}

.kpi-content {
  padding: 20px 20px 0 20px;
  position: relative;
  z-index: 2;
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
}

.kpi-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}
.kpi-icon.pink { background: rgba(236, 72, 153, 0.15); }
.kpi-icon.violet { background: rgba(168, 85, 247, 0.15); }
.kpi-icon.cyan { background: rgba(6, 182, 212, 0.15); }
.kpi-icon.orange { background: rgba(249, 115, 22, 0.15); }

.kpi-value {
  font-size: 2.2rem;
  margin-top: 6px;
  line-height: 1;
  color: var(--foreground);
}

.kpi-sub {
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 6px;
}
.kpi-sub.green { color: var(--success); }
.kpi-sub.red { color: var(--destructive); }
.kpi-sub .muted { color: var(--muted-foreground); font-weight: 400; }

.kpi-chart-wrapper {
  width: 100%;
  height: 55px;
  margin-top: 8px;
  position: relative;
  z-index: 1;
}

.kpi-svg {
  width: 100%;
  height: 100%;
  display: block;
}

[data-theme="light"] .bg-pink-tint { background: #fff8fa; }
[data-theme="light"] .bg-purple-tint { background: #fbf8ff; }
[data-theme="light"] .bg-cyan-tint { background: #f5fcff; }
[data-theme="light"] .bg-orange-tint { background: #fffcf8; }

/* Grids */
.grid-2-1 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 18px;
}

.panel-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card, 16px);
  padding: 22px;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.panel-title { font-size: 1.1rem; font-weight: 700; color: var(--foreground); }
.panel-sub { font-size: 0.78rem; color: var(--muted-foreground); }

.time-pills {
  display: flex;
  background: var(--background);
  padding: 3px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.time-pills button {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  padding: 5px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 8px;
}

.time-pills button.active {
  background: var(--surface);
  color: var(--foreground);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.chart-footer-stats {
  display: flex;
  gap: 28px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.stat-lbl { display: block; font-size: 0.68rem; font-weight: 700; color: var(--muted-foreground); }
.stat-num { font-size: 1.15rem; font-family: var(--font-serif); font-weight: 700; }
.stat-num.pink { color: var(--brand); }
.stat-num.purple { color: var(--violet); }
.stat-num.cyan { color: var(--cyan); }

/* Donut */
.donut-wrapper {
  position: relative;
  width: 170px;
  height: 170px;
  margin: 24px auto;
}

.donut-center {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.center-num { font-size: 1.6rem; display: block; line-height: 1; color: var(--foreground); }
.center-lbl { font-size: 0.65rem; color: var(--muted-foreground); font-weight: 700; }

.legend-list { 
  display: flex; 
  flex-direction: column; 
  gap: 12px;
  margin-top: 18px;
}

.legend-item { 
  display: flex; 
  align-items: center; 
  font-size: 0.95rem;
  color: var(--muted-foreground); 
}

.legend-item .dot { 
  width: 10px; 
  height: 10px; 
  border-radius: 50%; 
  margin-right: 12px; 
}

.legend-item .val { 
  margin-left: auto; 
  font-weight: 700; 
  font-size: 0.98rem; 
  color: var(--foreground); 
}

/* Table */
.custom-table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.custom-table { 
  width: 100%; 
  border-collapse: collapse; 
  margin-top: 16px; 
}

.custom-table th { 
  text-align: left; 
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted-foreground); 
  padding: 12px 14px; 
  border-bottom: 1px solid var(--border); 
  white-space: nowrap;
}

.custom-table td { 
  padding: 16px 14px;
  font-size: 0.95rem;
  border-bottom: 1px solid var(--border); 
  color: var(--foreground); 
  white-space: nowrap;
}

.table-row:hover { 
  background: rgba(0, 0, 0, 0.02); 
}

.content-cell { 
  font-weight: 600; 
  white-space: normal;
  min-width: 220px;
}

.type-badge { 
  font-size: 0.78rem; 
  font-weight: 700; 
  padding: 4px 10px; 
  border-radius: 99px; 
}

.type-badge.reel { 
  background: rgba(236, 72, 153, 0.12); 
  color: var(--brand, #ec4899); 
}

.type-badge.foto { 
  background: rgba(168, 85, 247, 0.12); 
  color: var(--violet, #a855f7); 
}

.type-badge.carousel { 
  background: rgba(6, 182, 212, 0.12); 
  color: var(--cyan, #06b6d4); 
}

.er-text { 
  color: var(--brand, #ec4899); 
  font-weight: 700; 
}

.date-text { 
  color: var(--muted-foreground); 
  font-size: 0.85rem; 
}

.link-btn { 
  background: transparent; 
  border: none; 
  color: var(--foreground); 
  font-size: 0.9rem; 
  cursor: pointer; 
  transition: opacity 0.2s;
  text-decoration: none;
}

.link-btn:hover {
  opacity: 0.8;
}
</style>