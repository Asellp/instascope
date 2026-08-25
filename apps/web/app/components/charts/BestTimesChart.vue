<!-- apps/web/app/components/charts/BestTimesChart.vue -->
<template>
  <div class="best-times-container">

    <!-- SKELETON LOADING -->
    <div v-if="loading" class="skeleton-box" style="height: 280px; border-radius: 16px;"></div>

    <!-- GERÇEK HATA VEYA VERİ YOK/BOŞ DURUMU (F3.5 DoD) -->
    <AppEmptyState
      v-else-if="error || !hasData"
      :type="error ? 'error' : 'empty'"
      :title="error ? 'Isı haritası yüklenemedi' : 'Henüz ısı haritası verisi yok'"
      :description="error ? 'Sunucuya bağlanırken yetkilendirme veya bağlantı hatası oluştu (401 Unauthorized).' : 'Bu hesabın etkileşim saatlerini hesaplamak için backend tarafında yeterli gönderi/yorum verisi henüz toplanmadı.'"
      :action-label="error ? 'Tekrar dene' : undefined"
      @action="$emit('retry')"
    />

    <!-- GERÇEK VERİ VARSA ÇALIŞACAK ALAN -->
    <template v-else>
      <!-- 1. ÖNERİLEN PAYLAŞIM ZAMANI VURGU BANNER'I (HERO HIGHLIGHT) -->
      <div v-if="bestTime" class="recommendation-banner">
        <div class="banner-icon-box">
          <span class="pulse-ring"></span>
          <span class="icon">🔥</span>
        </div>
        <div class="banner-content">
          <span class="banner-label">YAPAY ZEKA ÖNERİSİ · EN İYİ PAYLAŞIM ZAMANI</span>
          <h4 class="banner-title">
            {{ bestTime.dayName }} günleri saat {{ bestTime.hourRange }} arası
          </h4>
          <p class="banner-sub">
            Takipçilerinin %{{ bestTime.engagementRate }} kadarı bu zaman aralığında aktif. Paylaşımlarında en yüksek etkileşimi bu saatlerde alıyorsun.
          </p>
        </div>
      </div>

      <!-- 2. GÜN x SAAT ISI HARİTASI TABLOSU -->
      <div class="heatmap-card">
        <div class="heatmap-header">
          <div>
            <h3 class="card-title font-serif-display">Gün × Saat Etkileşim Yoğunluğu</h3>
            <p class="card-sub">Son 30 gündeki yorum ve beğeni zamanlamaları baz alınmıştır.</p>
          </div>

          <!-- RENK SKALASI LEJANTI (COLORBIND-SAFE VIRIDIS / PLASMA) -->
          <div class="legend-wrap">
            <span class="legend-text">Düşük</span>
            <div class="legend-bar"></div>
            <span class="legend-text">Yüksek Etkileşim</span>
          </div>
        </div>

        <div class="heatmap-table-wrapper">
          <div class="heatmap-grid">
            <!-- Sol Üst Köşe (Boş) -->
            <div class="grid-header-cell"></div>

            <!-- Saat Başlıkları (00:00 - 21:00) -->
            <div v-for="hour in hours" :key="hour" class="grid-header-cell hour-label">
              {{ hour }}
            </div>

            <!-- Gün Satırları -->
            <template v-for="(day, dayIdx) in days" :key="day">
              <div class="day-label">{{ day }}</div>

              <!-- Saat Hücreleri -->
              <div
                v-for="(hour, hourIdx) in hours"
                :key="`${dayIdx}-${hourIdx}`"
                :class="[
                  'heat-cell',
                  { 'is-best-slot': isBestSlot(dayIdx, hourIdx) }
                ]"
                :style="{ background: getCellColor(getScore(dayIdx, hourIdx)) }"
                :title="`${day} ${hour} - Etkileşim Skoru: %${getScore(dayIdx, hourIdx)}`"
              >
                <!-- En iyi zamana taç ikonu -->
                <span v-if="isBestSlot(dayIdx, hourIdx)" class="best-badge" title="Önerilen Paylaşım Zamanı">
                  👑
                </span>
                <span class="score-val">%{{ getScore(dayIdx, hourIdx) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface RawBackendCell {
  hour?: number            // 0 - 23
  dayOfWeek?: number       // 1 (Pzt) - 7 (Paz) ISO formatı
  dayIndex?: number        // 0 - 6
  hourIndex?: number       // 0 - 7
  avgEngagement?: number
  sampleSize?: number
  score?: number
}

interface MappedHeatmapCell {
  dayIndex: number  // 0 = Pzt, 6 = Paz
  hourIndex: number // 0 = 00:00, 1 = 03:00, ..., 7 = 21:00
  score: number     // 0 - 100
}

const props = withDefaults(defineProps<{
  heatmapData?: RawBackendCell[]
  loading?: boolean
  error?: boolean
}>(), {
  heatmapData: () => [],
  loading: false,
  error: false
})

defineEmits<{ (e: 'retry'): void }>()

const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const daysFull = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']

// Başlangıç saatine göre 3 saatlik aralık üretir (Örn: "09:00" -> "09:00 - 12:00")
function formatHourRange(startHourStr: string): string {
  const startHour = parseInt(startHourStr.split(':')[0], 10) || 0
  const endHour = (startHour + 3) % 24
  const endHourStr = `${String(endHour).padStart(2, '0')}:00`
  return `${startHourStr} - ${endHourStr}`
}

/**
 * BACKEND DÖNÜŞTÜRÜCÜ (MAPPER):
 * Backend'den gelen { hour: 0-23, dayOfWeek: 1-7 } ham verisini
 * 7 gün x 8 saat dilimine (3 saatlik aralıklar) dönüştürür.
 */
const normalizedData = computed<MappedHeatmapCell[]>(() => {
  if (!Array.isArray(props.heatmapData) || props.heatmapData.length === 0) return []

  // 7x8 matrisi 0 ile başlat
  const matrix: number[][] = Array(7).fill(0).map(() => Array(8).fill(0))

  let maxRawVal = 0

  props.heatmapData.forEach(item => {
    // 1. Gün Indeksi Belirleme (0 = Pazartesi ... 6 = Pazar)
    let dIdx = 0
    if (typeof item.dayIndex === 'number') {
      dIdx = item.dayIndex
    } else if (typeof item.dayOfWeek === 'number') {
      dIdx = (item.dayOfWeek - 1 + 7) % 7 // 1-7 ISO gününü 0-6 indekse çevirir
    }

    // 2. Saat Dilimi Indeksi Belirleme (00:00-23:00 -> 0-7 dilim)
    let hIdx = 0
    if (typeof item.hourIndex === 'number') {
      hIdx = item.hourIndex
    } else if (typeof item.hour === 'number') {
      hIdx = Math.min(7, Math.floor(item.hour / 3)) // Örn: 20:00 -> Math.floor(20/3) = 6 (18:00 dilimi)
    }

    // 3. Skor Değeri Okuma
    const rawVal = item.score ?? item.avgEngagement ?? item.sampleSize ?? 0
    matrix[dIdx][hIdx] += rawVal
    if (matrix[dIdx][hIdx] > maxRawVal) maxRawVal = matrix[dIdx][hIdx]
  })

  // Matrisi 0-100 ölçeğine normalize et
  const result: MappedHeatmapCell[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 8; h++) {
      const val = matrix[d][h]
      const score = maxRawVal > 0 ? Math.round((val / maxRawVal) * 100) : 0
      if (score > 0) {
        result.push({ dayIndex: d, hourIndex: h, score })
      }
    }
  }

  return result
})

const hasData = computed(() => normalizedData.value.length > 0)

// Dönüştürülmüş verideki en yüksek skora sahip hücre
const bestTimeCell = computed(() => {
  if (!hasData.value) return null
  return [...normalizedData.value].sort((a, b) => b.score - a.score)[0]
})

const bestTime = computed(() => {
  if (!bestTimeCell.value) return null
  const cell = bestTimeCell.value
  const slot = hours[cell.hourIndex] || '21:00'
  return {
    dayName: daysFull[cell.dayIndex] || 'Perşembe',
    hourSlot: slot,
    hourRange: formatHourRange(slot),
    engagementRate: cell.score
  }
})

function getScore(dayIdx: number, hourIdx: number): number {
  if (!hasData.value) return 0
  const cell = normalizedData.value.find(c => c.dayIndex === dayIdx && c.hourIndex === hourIdx)
  return cell ? cell.score : 0
}

function isBestSlot(dayIdx: number, hourIdx: number): boolean {
  if (!bestTimeCell.value) return false
  return bestTimeCell.value.dayIndex === dayIdx && bestTimeCell.value.hourIndex === hourIdx
}

function getCellColor(score: number): string {
  if (score <= 0) {
    return 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(15, 17, 26, 0.6) 100%)'
  }
  if (score < 20) {
    return 'linear-gradient(135deg, rgba(76, 29, 149, 0.35) 0%, rgba(30, 27, 75, 0.55) 100%)'
  }
  if (score < 40) {
    return 'linear-gradient(135deg, rgba(147, 51, 234, 0.65) 0%, rgba(107, 33, 168, 0.8) 100%)'
  }
  if (score < 65) {
    return 'linear-gradient(135deg, rgba(236, 72, 153, 0.85) 0%, rgba(219, 39, 119, 0.95) 100%)'
  }
  if (score < 85) {
    return 'linear-gradient(135deg, #fb7185 0%, #f97316 100%)'
  }
  return 'linear-gradient(135deg, #fef08a 0%, #facc15 50%, #f59e0b 100%)'
}
</script>

<style scoped>
.best-times-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.recommendation-banner {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(249, 115, 22, 0.12) 100%);
  border: 1px solid rgba(236, 72, 153, 0.35);
  border-radius: var(--radius-card, 16px);
  padding: 18px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.12);
}

.banner-icon-box {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--grad-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px solid var(--brand);
  animation: pulse-ring 2s infinite ease-out;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  100% { transform: scale(1.15); opacity: 0; }
}

.banner-content { flex: 1; }

.banner-label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--brand);
}

.banner-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 2px 0;
}

.banner-sub {
  font-size: 0.82rem;
  color: var(--muted-foreground);
  margin: 0;
  line-height: 1.4;
}

.heatmap-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card, 16px);
  padding: 22px;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.card-title { font-size: 1.15rem; margin: 0; color: var(--foreground); }
.card-sub { font-size: 0.8rem; color: var(--muted-foreground); margin-top: 4px; }

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: var(--muted-foreground);
  font-weight: 600;
}

.legend-bar {
  width: 120px;
  height: 8px;
  border-radius: 99px;
  background: linear-gradient(90deg, rgba(76, 29, 149, 0.4) 0%, #9333ea 25%, #ec4899 55%, #f97316 80%, #facc15 100%);
  box-shadow: 0 0 10px rgba(236, 72, 153, 0.35);
}

.heatmap-table-wrapper { overflow-x: auto; }

.heatmap-grid {
  display: grid;
  grid-template-columns: 50px repeat(8, minmax(50px, 1fr));
  gap: 6px;
  min-width: 500px;
}

.grid-header-cell, .day-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted-foreground);
}

.heat-cell {
  position: relative;
  height: 44px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
}

.heat-cell:hover {
  transform: translateY(-2px) scale(1.06);
  z-index: 10;
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.heat-cell.is-best-slot {
  border: 2px solid #ffffff !important;
  color: #1e1b4b !important;
  font-weight: 800;
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.75), 0 0 35px rgba(245, 158, 11, 0.4) !important;
  animation: highlight-pulse 2s infinite ease-in-out;
}

@keyframes highlight-pulse {
  0%, 100% { box-shadow: 0 0 16px rgba(250, 204, 21, 0.6); }
  50% { box-shadow: 0 0 26px rgba(250, 204, 21, 1), 0 0 40px rgba(245, 158, 11, 0.6); }
}

.best-badge {
  position: absolute;
  top: -8px;
  right: -6px;
  font-size: 0.85rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.score-val { pointer-events: none; }
</style>