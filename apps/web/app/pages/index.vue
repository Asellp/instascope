<template>
  <div class="dashboard-page">
    
    <!-- 1. HERO BANNER -->
    <div class="hero-card">
      <div class="hero-badge pulse-anim">
        <span class="pulse-dot-wrap" style="width: 8px; height: 8px; margin-right: 6px;">
          <span class="pulse-dot-ring"></span>
          <span style="width: 6px; height: 6px; background: var(--brand); border-radius: 50%;"></span>
        </span>
        Haftalık özet · 22 Tem
      </div>
      
      <h1 class="hero-title font-serif-display">
        Bu hafta <span class="text-gradient">184.2K</span> takipçi ile 12 gönderi yayında.
      </h1>

      <p class="hero-desc">
        Etkileşim oranının <strong>%0.9 puan</strong> arttı. En iyi performansı <strong>reel</strong> içerikler gösterdi. AI önerisine göre bir sonraki paylaşımın için en iyi zaman <strong>Perşembe 19:00</strong>.
      </p>

      <div class="hero-footer">
        <div class="pill-group">
          <span class="pill green">● {{ accounts.length || 4 }} hesap aktif</span>
          <span class="pill blue">⚡ Otomasyon açık</span>
          <span class="pill amber">⏱️ Sonraki toplama 42 dk</span>
        </div>

        <div class="hero-actions">
          <button class="btn-dark">Rapor indir</button>
          <button class="btn-primary-grad">+ Hesap ekle</button>
        </div>
      </div>
    </div>

    <!-- 2. AMBIENT GLOW & SKELETON SUPPORTED KPI KARTLARI -->
    <div class="kpi-grid">
      <!-- Takipçi -->
      <div class="kpi-card bg-pink-tint ambient-pink">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">TAKİPÇİ</span>
            <div class="kpi-icon pink">📈</div>
          </div>
          <div v-if="loading" class="skeleton-box" style="height: 36px; width: 120px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">184.2K</div>
          <div class="kpi-sub green">↗ +4.8% <span class="muted">son 30 gün</span></div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ec4899" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M0,32 Q20,25 40,28 T80,12 T100,6 L100,40 L0,40 Z" fill="url(#pinkGrad)" />
            <path d="M0,32 Q20,25 40,28 T80,12 T100,6" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="6" r="3" fill="#ec4899" />
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
          <div v-if="loading" class="skeleton-box" style="height: 36px; width: 100px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">%6.42</div>
          <div class="kpi-sub green">↗ +0.9% <span class="muted">son 30 gün</span></div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#a855f7" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M0,35 Q25,30 50,18 T80,12 T100,4 L100,40 L0,40 Z" fill="url(#purpleGrad)" />
            <path d="M0,35 Q25,30 50,18 T80,12 T100,4" fill="none" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="4" r="3" fill="#a855f7" />
          </svg>
        </div>
      </div>

      <!-- Ort. Yorum -->
      <div class="kpi-card bg-cyan-tint ambient-cyan">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">ORT. YORUM</span>
            <div class="kpi-icon cyan">💬</div>
          </div>
          <div v-if="loading" class="skeleton-box" style="height: 36px; width: 80px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">312</div>
          <div class="kpi-sub red">↘ -2.1% <span class="muted">son 30 gün</span></div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M0,8 Q30,12 60,24 T100,34 L100,40 L0,40 Z" fill="url(#cyanGrad)" />
            <path d="M0,8 Q30,12 60,24 T100,34" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="34" r="3" fill="#06b6d4" />
          </svg>
        </div>
      </div>

      <!-- Erişim -->
      <div class="kpi-card bg-orange-tint ambient-orange">
        <div class="kpi-content">
          <div class="kpi-top">
            <span class="kpi-label">ERİŞİM (30G)</span>
            <div class="kpi-icon orange">👁️</div>
          </div>
          <div v-if="loading" class="skeleton-box" style="height: 36px; width: 110px; margin-top: 6px;"></div>
          <div v-else class="kpi-value font-serif-display">2.1M</div>
          <div class="kpi-sub green">↗ +12.4% <span class="muted">son 30 gün</span></div>
        </div>

        <div class="kpi-chart-wrapper">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="kpi-svg">
            <defs>
              <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#f97316" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M0,30 Q35,22 70,14 T100,4 L100,40 L0,40 Z" fill="url(#orangeGrad)" />
            <path d="M0,30 Q35,22 70,14 T100,4" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="4" r="3" fill="#f97316" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 3. İNTERAKTİF HOVER TOOLTİP'Lİ TAKİPÇİ BÜYÜMESİ -->
    <div class="grid-2-1">
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Takipçi büyümesi</h3>
            <p class="panel-sub">Son 30 gün · günlük</p>
          </div>
          <div class="time-pills">
            <button>7g</button>
            <button class="active">30g</button>
            <button>90g</button>
          </div>
        </div>

        <div class="chart-area" @mousemove="handleChartHover" @mouseleave="hoverPos = null">
          <svg viewBox="0 0 500 150" class="main-chart">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ec4899" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M0,120 Q50,100 100,105 T200,80 T300,60 T400,45 T500,15 L500,150 L0,150 Z" fill="url(#chartGrad)" />
            <path d="M0,120 Q50,100 100,105 T200,80 T300,60 T400,45 T500,15" fill="none" stroke="#ec4899" stroke-width="3" />
            <circle cx="500" cy="15" r="5" fill="#f97316" />

            <!-- Canlı Hover Çizgisi -->
            <line v-if="hoverPos" :x1="hoverPos.x" y1="0" :x2="hoverPos.x" y2="150" stroke="rgba(255,255,255,0.2)" stroke-dasharray="4 4" />
          </svg>

          <!-- Floating Hover Tooltip -->
          <div v-if="hoverPos" class="custom-tooltip" :style="{ left: hoverPos.x + 'px', top: '20px' }">
            📅 {{ hoverPos.date }} — <strong>{{ hoverPos.value }}</strong> Takipçi
          </div>
        </div>

        <div class="chart-footer-stats">
          <div>
            <span class="stat-lbl">YENİ TAKİPÇİ</span>
            <span class="stat-num pink">+8.4K</span>
          </div>
          <div>
            <span class="stat-lbl">ETKİLEŞİM</span>
            <span class="stat-num purple">312K</span>
          </div>
          <div>
            <span class="stat-lbl">ERİŞİM</span>
            <span class="stat-num cyan">2.1M</span>
          </div>
        </div>
      </div>

      <div class="panel-card">
        <h3 class="panel-title">İçerik karışımı</h3>
        <p class="panel-sub">Gönderi tipine göre</p>

        <div class="donut-wrapper">
          <svg viewBox="0 0 100 100" class="donut-chart">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#ec4899" stroke-width="12" stroke-dasharray="120 240" stroke-dashoffset="0" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" stroke-width="12" stroke-dasharray="65 240" stroke-dashoffset="-120" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#06b6d4" stroke-width="12" stroke-dasharray="45 240" stroke-dashoffset="-185" />
          </svg>
          <div class="donut-center">
            <span class="center-num font-serif-display">100</span>
            <span class="center-lbl">GÖNDERİ</span>
          </div>
        </div>

        <div class="legend-list">
          <div class="legend-item"><span class="dot pink"></span> Reel <span class="val">52%</span></div>
          <div class="legend-item"><span class="dot purple"></span> Carousel <span class="val">28%</span></div>
          <div class="legend-item"><span class="dot cyan"></span> Foto <span class="val">20%</span></div>
        </div>
      </div>
    </div>

    <!-- 4. HOVER POP-UP'LI ISI HARİTASI -->
    <div class="grid-2-1">
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Etkileşim ısı haritası</h3>
            <p class="panel-sub">Gün × saat · son 4 hafta</p>
          </div>
          <span class="highlight-badge pulse-anim">Perşembe 19:00 zirvede</span>
        </div>

        <div class="heatmap-grid">
          <div class="heatmap-row" v-for="day in ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']" :key="day">
            <span class="day-lbl">{{ day }}</span>
            <div class="heat-cells">
              <div 
                v-for="i in 12" 
                :key="i" 
                :class="['heat-cell', getHeatClass(day, i)]"
                :title="`${day} ${i*2}:00 — Etkileşim Oranı: %${(i*0.7).toFixed(1)}`"
              ></div>
            </div>
          </div>
        </div>

        <div class="heatmap-legend">
          <span>Düşük</span>
          <div class="legend-bar"></div>
          <span>Yüksek</span>
        </div>
      </div>

      <div class="panel-card">
        <h3 class="panel-title">🌐 Kitle dağılımı</h3>
        <p class="panel-sub">İlk 5 şehir</p>

        <div class="progress-list">
          <div class="progress-item">
            <div class="prog-info"><span>İstanbul</span><span>42%</span></div>
            <div class="prog-bg"><div class="prog-fill pink" style="width: 42%"></div></div>
          </div>
          <div class="progress-item">
            <div class="prog-info"><span>Ankara</span><span>18%</span></div>
            <div class="prog-bg"><div class="prog-fill purple" style="width: 18%"></div></div>
          </div>
          <div class="progress-item">
            <div class="prog-info"><span>İzmir</span><span>12%</span></div>
            <div class="prog-bg"><div class="prog-fill cyan" style="width: 12%"></div></div>
          </div>
          <div class="progress-item">
            <div class="prog-info"><span>Bursa</span><span>8%</span></div>
            <div class="prog-bg"><div class="prog-fill orange" style="width: 8%"></div></div>
          </div>
          <div class="progress-item">
            <div class="prog-info"><span>Antalya</span><span>6%</span></div>
            <div class="prog-bg"><div class="prog-fill muted" style="width: 6%"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. SON GÖNDERİLER TABLOSU -->
    <div class="panel-card">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Son gönderiler</h3>
          <p class="panel-sub">Etkileşime göre sıralandı</p>
        </div>
        <button class="link-btn">Tümünü gör ↗</button>
      </div>

      <table class="custom-table">
        <thead>
          <tr>
            <th>İçerik</th>
            <th>Tip</th>
            <th>Beğeni</th>
            <th>Yorum</th>
            <th>ER</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          <tr class="table-row">
            <td class="content-cell"><span class="media-icon">🎬</span> Yaz kampanya özet — perde arkası</td>
            <td><span class="type-badge reel">Reel</span></td>
            <td>24.1K</td>
            <td>412</td>
            <td class="er-text">%8.9</td>
            <td class="date-text">2s önce</td>
          </tr>
          <tr class="table-row">
            <td class="content-cell"><span class="media-icon">🖼️</span> Yeni koleksiyon lansmanı</td>
            <td><span class="type-badge foto">Foto</span></td>
            <td>12.8K</td>
            <td>287</td>
            <td class="er-text">%6.1</td>
            <td class="date-text">1g önce</td>
          </tr>
          <tr class="table-row">
            <td class="content-cell"><span class="media-icon">🎴</span> Kullanıcı hikâyeleri #3</td>
            <td><span class="type-badge carousel">Carousel</span></td>
            <td>9.4K</td>
            <td>198</td>
            <td class="er-text">%5.4</td>
            <td class="date-text">2g önce</td>
          </tr>
          <tr class="table-row">
            <td class="content-cell"><span class="media-icon">🎬</span> Atölye günlüğü</td>
            <td><span class="type-badge reel">Reel</span></td>
            <td>18.7K</td>
            <td>356</td>
            <td class="er-text">%7.8</td>
            <td class="date-text">3g önce</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})


import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import type { Account } from '~/utils/mockData'

const api = useApi()
const accounts = ref<Account[]>([])
const loading = ref(true)

const hoverPos = ref<{ x: number; date: string; value: string } | null>(null)

onMounted(async () => {
  try {
    accounts.value = await api.getAccounts()
  } finally {
    loading.value = false
  }
})

const handleChartHover = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const day = Math.floor((x / rect.width) * 30) + 1
  hoverPos.value = {
    x: Math.min(Math.max(x, 10), rect.width - 10),
    date: `${day} Temmuz`,
    value: `${(170 + day * 0.47).toFixed(1)}K`
  }
}

const getHeatClass = (day: string, idx: number) => {
  if (day === 'Pe' && idx >= 8 && idx <= 11) return 'level-high'
  if ((day === 'Pt' || day === 'Sa') && idx >= 4 && idx <= 7) return 'level-mid'
  if (idx % 3 === 0) return 'level-low'
  return 'level-none'
}
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

/* Hero */
/* Hero Ana Kart - İdeal Ara Büyüklük (Orta Boy) */
/* Hero Ana Kart - Görseldeki Gibi Yumuşak & Premium Koyu Mod */
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

/* "Haftalık özet" Rozeti */
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

/* Başlık */
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

/* Açıklama Metni */
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

/* Alt Kısım Hizalaması */
.hero-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 26px;
  flex-wrap: wrap;
  gap: 16px;
}

/* Alt Haplar / Pill Yapıları (Koyu & Yumuşak) */
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

/* Sağ Alt Butonlar */
.hero-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
}

/* "Rapor indir" Koyu Oval Buton */
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

/* "+ Hesap ekle" Gradient Butonu */
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
  border: 1.5px solid rgba(225, 29, 72, 0.45); /* Kenarlık belirgin koyu fuşya/pembe yapıldı */
  border-radius: 22px;
  padding: 28px 32px;
  box-shadow: 0 10px 30px rgba(225, 29, 72, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05); /* Dış hatları vurgulayan daha koyu gölge */
  position: relative;
  overflow: hidden;
}

[data-theme="light"] .hero-badge {
  background: rgba(244, 63, 94, 0.08);
  color: #e11d48;
  border-color: rgba(244, 63, 94, 0.18);
}

[data-theme="light"] .hero-title {
  color: #18181b; /* Koyu net okunabilir metin */
}

[data-theme="light"] .hero-desc {
  color: #52525b;
}

[data-theme="light"] .hero-desc strong {
  color: #18181b;
}

/* 2. Aydınlık Mod Buton Yapıları */
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

/* 3. Aydınlık Mod Haplar (Pills) */
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

.chart-area {
  position: relative;
  cursor: crosshair;
}

.main-chart { width: 100%; height: 220px; }

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

.donut-chart { transform: rotate(-90deg); }

.donut-center {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.center-num { font-size: 1.6rem; display: block; line-height: 1; color: var(--foreground); }
.center-lbl { font-size: 0.65rem; color: var(--muted-foreground); font-weight: 700; }

/* Donut Altı Açıklama Listesi - Alanı Aşağı İttik */
.legend-list { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; /* Elemanlar arası dikey boşluğu artırdık */
  margin-top: 18px; /* Listeyi donut grafiğinden daha aşağı kaydırdık */
}

/* Açıklama Satırları - Font Büyütüldü */
.legend-item { 
  display: flex; 
  align-items: center; 
  font-size: 0.95rem; /* 0.88rem olan font boyutunu belirginleştirdik */
  color: var(--muted-foreground); 
}

/* Renkli Nokta İkonları */
.legend-item .dot { 
  width: 10px; 
  height: 10px; 
  border-radius: 50%; 
  margin-right: 12px; 
}

/* Sağda Yazan Değer Sayıları */
.legend-item .val { 
  margin-left: auto; 
  font-weight: 700; 
  font-size: 0.98rem; /* Sayıları da metinle orantılı büyüttük */
  color: var(--foreground); 
}
.dot.pink { background: var(--brand); }
.dot.purple { background: var(--violet); }
.dot.cyan { background: var(--cyan); }

/* Heatmap */
/* Heatmap Ana Alanı */
.heatmap-grid { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  margin-top: 18px; 
  width: 100%; /* Kartı tam kaplamasını sağlar */
}

.heatmap-row { 
  display: flex; 
  align-items: center; 
  gap: 14px; 
  width: 100%;
}

.day-lbl { 
  font-size: 0.85rem; 
  color: var(--muted-foreground); 
  width: 32px; /* Gün etiket alanı */
  font-weight: 600;
  flex-shrink: 0; /* Etiketin büzülmesini engeller */
}

/* KUTUCUKLARIN BULUNDUĞU ALAN (Tüm Genişliği Kaplar) */
.heat-cells { 
  display: flex; 
  gap: 10px; 
  flex: 1; /* Sağdaki tüm boşluğu doldurur */
  width: 100%;
}

/* BÜYÜK KUTUCUKLAR (Yükseklik 48px, Tam Esnek Genişlik) */
.heat-cell { 
  height: 48px; /* Kutucuklar dikeyde belirgin şekilde büyütüldü */
  flex: 1; /* Her bir kutucuk eşit şekilde genişleyerek alanı tam kaplar */
  min-width: 0; /* Taşamayı önler */
  border-radius: 10px; /* Yumuşak büyük köşeler */
  background: rgba(0, 0, 0, 0.03); 
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease; 
  cursor: pointer; 
}

.heat-cell:hover { 
  transform: scale(1.12); 
  z-index: 5; 
  filter: brightness(1.25); 
}

/* Renk Seviyeleri */
.heat-cell.level-none { 
  background: rgba(255, 255, 255, 0.03); 
}

.heat-cell.level-low { 
  background: rgba(236, 72, 153, 0.22); 
}

.heat-cell.level-mid { 
  background: rgba(236, 72, 153, 0.55); 
}

.heat-cell.level-high { 
  background: var(--brand, #ec4899); 
  box-shadow: 0 0 16px rgba(236, 72, 153, 0.6); 
}

/* Alt Lejant Alanı */
.heatmap-legend { 
  display: flex; 
  align-items: center; 
  justify-content: flex-end; 
  gap: 12px; 
  font-size: 0.8rem; 
  color: var(--muted-foreground); 
  margin-top: 20px; 
}

.legend-bar { 
  width: 110px; 
  height: 8px; 
  border-radius: 99px; 
  background: linear-gradient(90deg, rgba(255,255,255,0.05), var(--brand, #ec4899)); 
}


/* Progress List */
.progress-list { 
  display: flex; 
  flex-direction: column; 
  gap: 18px; 
  margin-top: 20px; 
}

.prog-info { 
  display: flex; 
  justify-content: space-between; 
  font-size: 0.9rem; /* Font büyütüldü */
  font-weight: 600; 
  margin-bottom: 6px; 
  color: var(--foreground); 
}

/* Barların Kalınlığı 6px -> 8px Yapıldı */
.prog-bg { 
  height: 8px; 
  background: var(--background); 
  border-radius: 99px; 
  overflow: hidden; 
}

.prog-fill { 
  height: 100%; 
  border-radius: 99px; 
}

.prog-fill.pink { background: var(--brand, #ec4899); }
.prog-fill.purple { background: var(--violet, #a855f7); }
.prog-fill.cyan { background: var(--cyan, #06b6d4); }
.prog-fill.orange { background: var(--brand-2, #f97316); }
.prog-fill.muted { background: var(--muted-foreground); }


/* Table */
.custom-table { 
  width: 100%; 
  border-collapse: collapse; 
  margin-top: 16px; 
}

.custom-table th { 
  text-align: left; 
  font-size: 0.8rem; /* Başlıklar büyütüldü */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted-foreground); 
  padding: 12px 14px; 
  border-bottom: 1px solid var(--border); 
}

.custom-table td { 
  padding: 16px 14px; /* Hücre boşlukları ferahlatıldı */
  font-size: 0.95rem; /* Satır metinleri büyütüldü */
  border-bottom: 1px solid var(--border); 
  color: var(--foreground); 
}

.table-row:hover { 
  background: rgba(0, 0, 0, 0.02); 
}

.content-cell { 
  font-weight: 600; 
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
}

.link-btn:hover {
  opacity: 0.8;
}
</style>