<template>
  <div class="accounts-page">
    
    <!-- ÜST BAŞLIK VE BUTON -->
    <div class="page-header">
      <div>
        <h1 class="page-title font-serif-display">Takip edilen hesaplar</h1>
        <p class="page-sub">5 hesap izleniyor · veri kaynakları: API, scrape ve mock.</p>
      </div>

      <button class="btn-primary-grad">+ Hesap ekle</button>
    </div>

    <!-- ARAMA VE FİLTRE BARLARI -->
    <div class="filter-bar">
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" type="text" placeholder="Hesap ara..." />
      </div>

      <div class="filter-pills">
        <button 
          v-for="filter in ['Tümü', 'API', 'Scrape', 'Mock']" 
          :key="filter"
          :class="['pill-btn', { active: activeFilter === filter }]"
          @click="activeFilter = filter"
        >
          {{ filter }}
        </button>
      </div>
    </div>

    <!-- HESAP KARTLARI GRİDİ -->
    <div class="accounts-grid">
      <div 
        v-for="acc in filteredAccounts" 
        :key="acc.id" 
        :class="['account-card', acc.borderClass]"
      >
        <div class="card-header">
          <div class="user-info">
            <div :class="['avatar-circle', acc.avatarBg]">{{ acc.avatar }}</div>
            <div>
              <h3 class="account-name">{{ acc.name }}</h3>
              <span class="account-handle">{{ acc.handle }}</span>
            </div>
          </div>

          <!-- Interactive Dropdown Menu -->
          <div class="dropdown-wrapper">
            <button class="menu-btn" @click.stop="toggleMenu(acc.id)">•••</button>
            <div v-if="activeMenuId === acc.id" class="dropdown-menu glass-effect">
              <button class="dropdown-item" @click="activeMenuId = null">📊 Detaylı Analiz</button>
              <button class="dropdown-item" @click="activeMenuId = null">🔄 Verileri Yenile</button>
              <button class="dropdown-item danger" @click="activeMenuId = null">🗑️ Takibi Bırak</button>
            </div>
          </div>
        </div>

        <div class="badges-row">
          <span class="source-badge">{{ acc.source }}</span>
          
          <span v-if="acc.status === 'Aktif'" class="status-badge success">
            <span class="dot">✓</span> Aktif
          </span>
          <span v-else-if="acc.status === 'Toplanıyor'" class="status-badge warning">
            <span class="dot">⏱</span> Toplanıyor
          </span>
          <span v-else-if="acc.status === 'Hata'" class="status-badge danger">
            <span class="dot">⚠</span> Hata
          </span>

          <span class="interval-text">{{ acc.interval }}</span>
        </div>

        <div class="metrics-row">
          <div class="metric-item">
            <span class="metric-label">TAKİPÇİ</span>
            <span class="metric-value font-serif-display">{{ acc.followers }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">ETKİLEŞİM</span>
            <span :class="['metric-value font-serif-display', acc.erClass]">{{ acc.er }}</span>
          </div>
        </div>

        <NuxtLink :to="`/accounts/${acc.slug}`" class="detail-link">
          <span>Detayları görüntüle</span>
          <span class="arrow">→</span>
        </NuxtLink>
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
import type { Account } from '~/utils/mockData'

const searchQuery = ref('')
const activeFilter = ref('Tümü')
const accounts = ref<Account[]>([])
const loading = ref(true)
const activeMenuId = ref<number | null>(null)

const api = useApi()

onMounted(async () => {
  try {
    accounts.value = await api.getAccounts()
  } finally {
    loading.value = false
  }

  window.addEventListener('click', () => {
    activeMenuId.value = null
  })
})

const toggleMenu = (id: number) => {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

const filteredAccounts = computed(() => {
  return accounts.value.filter(acc => {
    const matchesFilter = activeFilter.value === 'Tümü' || acc.source === activeFilter.value
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          acc.handle.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesFilter && matchesSearch
  })
})
</script>

<style scoped>
.accounts-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 2.8rem;
  font-weight: 400;
  line-height: 1.1;
  color: var(--foreground);
}

.page-sub {
  color: var(--muted-foreground);
  font-size: 0.9rem;
  margin-top: 6px;
}

.btn-primary-grad {
  background: var(--grad-brand);
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-input {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 10px 16px;
  border-radius: 99px;
  width: 320px;
}

.search-input input {
  background: transparent;
  border: none;
  color: var(--foreground);
  font-size: 0.85rem;
  outline: none;
  width: 100%;
}

.filter-pills {
  display: flex;
  gap: 8px;
  background: var(--surface);
  padding: 4px;
  border-radius: 99px;
  border: 1px solid var(--border);
}

.pill-btn {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  padding: 6px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 99px;
  cursor: pointer;
}

.pill-btn.active {
  background: var(--foreground);
  color: var(--background);
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.account-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.account-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px -10px rgba(0,0,0,0.3);
}

/* Gradient Borders */
.border-grad-orange::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #f97316, #ec4899); border-radius: 16px 16px 0 0;
}
.border-grad-purple::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #a855f7, #ec4899); border-radius: 16px 16px 0 0;
}
.border-grad-cyan::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #0284c7, #14b8a6); border-radius: 16px 16px 0 0;
}
.border-grad-pink::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #ec4899, #a855f7); border-radius: 16px 16px 0 0;
}
.border-grad-green::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #14b8a6, #84cc16); border-radius: 16px 16px 0 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-orange-red { background: linear-gradient(135deg, #f97316, #ef4444); }
.bg-pink-purple { background: linear-gradient(135deg, #ec4899, #a855f7); }
.bg-teal-cyan { background: linear-gradient(135deg, #14b8a6, #0284c7); }
.bg-purple-blue { background: linear-gradient(135deg, #a855f7, #3b82f6); }
.bg-green-teal { background: linear-gradient(135deg, #10b981, #14b8a6); }

.account-name { font-size: 1.05rem; font-weight: 700; color: var(--foreground); }
.account-handle { font-size: 0.82rem; color: var(--muted-foreground); }

/* Dropdown Menu */
.dropdown-wrapper {
  position: relative;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.menu-btn:hover { background: rgba(255,255,255,0.05); }

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 28px;
  width: 160px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 30;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.dropdown-item {
  background: transparent;
  border: none;
  color: var(--foreground);
  padding: 8px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--muted);
}

.dropdown-item.danger {
  color: var(--destructive);
}

.badges-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-badge {
  background: var(--background);
  border: 1px solid var(--border);
  color: var(--foreground);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-badge.success { background: rgba(34, 197, 94, 0.12); color: var(--success); }
.status-badge.warning { background: rgba(245, 158, 11, 0.12); color: var(--warning); }
.status-badge.danger { background: rgba(239, 68, 68, 0.12); color: var(--destructive); }

.interval-text {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-left: auto;
}

.metrics-row {
  display: flex;
  gap: 32px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.metric-item {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted-foreground);
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 1.6rem;
  font-weight: 400;
  line-height: 1.2;
}

.text-pink { color: var(--brand); }
.text-violet { color: var(--violet); }
.text-orange { color: var(--brand-2); }
.text-blue { color: var(--cyan); }
.text-muted { color: var(--muted-foreground); }

.detail-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--background);
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--foreground);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.detail-link:hover {
  border-color: var(--border-strong);
}
</style>