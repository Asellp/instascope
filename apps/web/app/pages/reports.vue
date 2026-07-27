<template>
  <div class="reports-page">
    
    <!-- ÜST BAŞLIK VE BUTON -->
    <div class="page-header">
      <div>
        <h1 class="page-title font-serif-display">Raporlar</h1>
        <p class="page-sub">PDF ve Excel formatında dışa aktarılabilir performans özetleri.</p>
      </div>

      <button class="btn-new-report">
        <span class="icon">📄</span> Yeni rapor
      </button>
    </div>

    <!-- ÖNE ÇIKAN HERO RAPOR KARTI -->
    <div class="hero-report-card">
      <div class="hero-content">
        <span class="hero-pill">Bu hafta · öne çıkan</span>
        <h2 class="hero-title font-serif-display">Haftalık özet raporun hazır</h2>
        <p class="hero-desc">
          4 hesap · 47 gönderi · 12.4K yeni etkileşim. Perşembe akşamı en iyi performansı gösterdiniz.
        </p>
      </div>

      <div class="hero-actions">
        <button class="btn-pdf">
          <span class="icon">↓</span> PDF indir
        </button>
        <button class="btn-preview">Önizle</button>
      </div>
    </div>

    <!-- GEÇMİŞ RAPORLAR LİSTESİ -->
    <div class="reports-list-card">
      <h3 class="list-title">Geçmiş raporlar</h3>

      <div class="reports-list">
        <div 
          v-for="report in pastReports" 
          :key="report.id" 
          class="report-item"
        >
          <div class="report-icon-box">
            <span>📄</span>
          </div>

          <div class="report-details">
            <h4 class="report-name">{{ report.title }}</h4>
            <div class="report-meta">
              <span class="meta-date">📅 {{ report.date }}</span>
              <span class="meta-accounts">📈 {{ report.accounts }}</span>
              <span :class="['type-tag', report.type === 'Otomatik' ? 'auto' : 'custom']">
                {{ report.type }}
              </span>
            </div>
          </div>

          <button class="btn-download">
            <span class="icon">↓</span> İndir
          </button>
        </div>
      </div>
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
import type { Report } from '~/utils/mockData'

const pastReports = ref<Report[]>([])
const loading = ref(true)

const api = useApi()

onMounted(async () => {
  try {
    pastReports.value = await api.getReports()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 2.8rem;
  font-weight: 400;
  line-height: 1.1;
}

.page-sub {
  color: var(--muted-foreground);
  font-size: 0.9rem;
  margin-top: 6px;
}

.btn-new-report {
  background: #fff;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.btn-new-report:hover { opacity: 0.9; }

/* Hero Report Card */
.hero-report-card {
  background: linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%);
  border-radius: 18px;
  padding: 36px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  box-shadow: 0 12px 32px rgba(236, 72, 153, 0.2);
  flex-wrap: wrap;
  gap: 24px;
}

.hero-content {
  max-width: 650px;
}

.hero-pill {
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 99px;
  margin-bottom: 14px;
}

.hero-title {
  font-size: 2.8rem;
  font-weight: 400;
  line-height: 1.1;
  color: #fff;
}

.hero-desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 10px;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-pdf {
  background: #0f111a;
  color: #fff;
  border: none;
  padding: 12px 22px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s;
}

.btn-pdf:hover { transform: translateY(-2px); }

.btn-preview {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 22px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-preview:hover { background: rgba(255, 255, 255, 0.35); }

/* Reports List Card */
.reports-list-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 28px;
}

.list-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.reports-list {
  display: flex;
  flex-direction: column;
}

.report-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--border);
}

.report-item:last-child {
  border-bottom: none;
}

.report-icon-box {
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.report-details {
  flex: 1;
}

.report-name {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--foreground);
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.78rem;
  color: var(--muted-foreground);
  margin-top: 4px;
}

.type-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.type-tag.auto {
  background: rgba(255, 255, 255, 0.04);
  color: var(--foreground);
}

.type-tag.custom {
  background: rgba(168, 85, 247, 0.12);
  color: var(--violet);
  border-color: rgba(168, 85, 247, 0.3);
}

.btn-download {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-download:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}
</style>