<!-- apps/web/app/pages/accounts/index.vue -->
<template>
  <div class="accounts-page">

    <div class="page-header">
      <div>
        <h1 class="page-title font-serif-display">Takip edilen hesaplar</h1>
        <p class="page-sub">{{ accounts.length }} hesap izleniyor · veri kaynakları: API, scrape ve mock.</p>
      </div>

      <button class="btn-primary-grad" @click="isWizardOpen = !isWizardOpen">
        {{ isWizardOpen ? 'Sihirbazı Kapat' : '+ Hesap ekle' }}
      </button>
    </div>

    <div v-if="isWizardOpen" class="mb-8">
      <AddAccountWizard @success="handleWizardSuccess" />
    </div>

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

    <!-- 1. YETKİSİZ ERİŞİM UYARISI (403 FORBIDDEN) -->
    <div v-if="accessDenied" class="empty-state-wrap">
      <AppEmptyState
        type="error"
        title="Bu sayfayı görüntüleme yetkiniz yok"
        description="Hesap yönetimi şu an sadece yönetici (admin) rolündeki kullanıcılara açık."
      />
    </div>

    <!-- 2. SUNUCU / AĞ HATASI UYARISI (GENEL HATA) -->
    <div v-else-if="fetchError" class="empty-state-wrap">
      <AppEmptyState
        type="error"
        title="Hesap listesi yüklenemedi"
        description="Sunucuya bağlanırken bir sorun oluştu. Bağlantınızı kontrol edip tekrar deneyin."
        action-label="Tekrar dene"
        @action="fetchAccounts"
      />
    </div>

    <!-- 3. HESAPLAR LİSTESİ (YÜKLENDİĞİNDE VE VERİ VARSA) -->
    <div v-else-if="!loading && filteredAccounts.length" class="accounts-grid">
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

          <div class="dropdown-wrapper">
            <button class="menu-btn" @click.stop="toggleMenu(acc.id)">•••</button>
            <div v-if="activeMenuId === acc.id" class="dropdown-menu glass-effect" @click.stop>
              <!-- 1. DETAYLI ANALİZ -->
              <button class="dropdown-item" @click="handleGoToDetail(acc.id)">
                📊 Detaylı Analiz
              </button>

              <!-- 2. VERİLERİ YENİLE -->
              <button class="dropdown-item" :disabled="isRefreshing" @click="handleRefreshAccount(acc.id)">
                🔄 {{ isRefreshing ? 'Yenileniyor...' : 'Verileri Yenile' }}
              </button>

              <!-- 3. TAKİBİ BIRAK (ONAY MODALI AÇAR) -->
              <button class="dropdown-item danger" :disabled="deletingId === acc.id" @click="openDeleteModal(acc)">
                🗑️ Takibi Bırak
              </button>
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

        <NuxtLink :to="`/accounts/${acc.id}`" class="detail-link">
          <span>Detayları görüntüle</span>
          <span class="arrow">→</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 4. ARAMA / FİLTRE BOŞ DURUMU -->
    <div v-else-if="!loading && !filteredAccounts.length" class="empty-state-wrap">
      <AppEmptyState
        type="search"
        title="Aramanıza uygun hesap bulunamadı"
        description="Seçilen filtrelere veya arama terimine uyan bir hesap bulunmuyor. Filtreleri değiştirebilir veya yeni bir hesap ekleyebilirsiniz."
        action-label="+ Yeni Hesap Ekle"
        @action="isWizardOpen = true"
      />
    </div>

    <!-- 5. YÜKLENİYOR (SKELETON) DURUMU -->
    <div v-else class="accounts-grid">
      <div v-for="n in 6" :key="n" class="account-card skeleton-card">
        <div class="card-header">
          <div class="user-info">
            <div class="skeleton-circle"></div>
            <div class="skeleton-text-group">
              <div class="skeleton-line w-24 h-4 mb-2"></div>
              <div class="skeleton-line w-16 h-3"></div>
            </div>
          </div>
        </div>
        <div class="badges-row mt-2">
          <div class="skeleton-line w-12 h-5 rounded-md"></div>
          <div class="skeleton-line w-16 h-5 rounded-full"></div>
        </div>
        <div class="metrics-row mt-4">
          <div class="skeleton-line w-20 h-8"></div>
          <div class="skeleton-line w-20 h-8"></div>
        </div>
        <div class="skeleton-line w-full h-10 mt-2 rounded-lg"></div>
      </div>
    </div>

    <!-- ONAY MODALI (CONFIRMATION MODAL) -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="accountToDelete" class="modal-overlay" @click="accountToDelete = null">
          <div class="modal-card" @click.stop>
            <div class="modal-icon-box">
              <span>🗑️</span>
            </div>
            
            <h3 class="modal-title font-serif-display">Takibi Bırakmak İstiyor Musunuz?</h3>
            <p class="modal-desc">
              <strong class="highlight-user">@{{ accountToDelete.igUsername || accountToDelete.name }}</strong> hesabını takipten çıkarmak üzeresiniz. Bu hesaba ait tüm geçmiş analitik verileri ve raporlar sistemden silinecektir.
            </p>

            <div class="modal-actions">
              <button 
                type="button" 
                class="btn-cancel" 
                :disabled="deletingId !== null" 
                @click="accountToDelete = null"
              >
                Vazgeç
              </button>
              <button 
                type="button" 
                class="btn-danger-confirm" 
                :disabled="deletingId !== null" 
                @click="confirmDeleteAccount"
              >
                {{ deletingId !== null ? 'Siliniyor...' : 'Evet, Takibi Bırak' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import auth from '~/middleware/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: auth
})

const router = useRouter()
const searchQuery = ref('')
const activeFilter = ref('Tümü')
const rawAccounts = ref<any[]>([])
const loading = ref(true)
const isRefreshing = ref(false)
const deletingId = ref<string | number | null>(null)
const accountToDelete = ref<any | null>(null)
const accessDenied = ref(false)
const fetchError = ref(false)
const activeMenuId = ref<string | number | null>(null)
const isWizardOpen = ref(false)

const api = useApi()

// Kart renk paletleri ve neon degradeler
const borderClasses = ['border-grad-orange', 'border-grad-pink', 'border-grad-purple', 'border-grad-cyan', 'border-grad-green']
const avatarBgs = ['bg-orange-red', 'bg-pink-purple', 'bg-teal-cyan', 'bg-purple-blue', 'bg-green-teal']

function enrichAccount(acc: any, index: number) {
  const avatarText = (acc.igUsername || acc.name || 'IG').substring(0, 2).toUpperCase()
  return {
    ...acc,
    avatar: acc.avatar || avatarText,
    handle: `@${acc.igUsername || acc.handle || acc.username}`,
    borderClass: acc.borderClass || borderClasses[index % borderClasses.length],
    avatarBg: acc.avatarBg || avatarBgs[index % avatarBgs.length],
    erClass: acc.erClass || 'text-pink',
    followers: acc.followers || '—',
    er: acc.er || '—',
    interval: acc.interval || '24 saatte bir',
    source: acc.source || 'API'
  }
}

async function fetchAccounts() {
  loading.value = true
  accessDenied.value = false
  fetchError.value = false
  try {
    const res = await api.getAccounts()
    rawAccounts.value = res
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      accessDenied.value = true
    } else {
      console.error('Hesaplar yüklenemedi:', err)
      fetchError.value = true
    }
  } finally {
    loading.value = false
  }
}

// 1. DETAYLI ANALİZE GİT
function handleGoToDetail(id: string | number) {
  activeMenuId.value = null
  router.push(`/accounts/${id}`)
}

// 2. VERİLERİ YENİLE
async function handleRefreshAccount(id: string | number) {
  activeMenuId.value = null
  isRefreshing.value = true
  try {
    const updated = await api.getAccountById(id)
    const idx = rawAccounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      rawAccounts.value[idx] = updated
    } else {
      await fetchAccounts()
    }
  } catch (err) {
    console.error('Hesap verisi yenilenemedi:', err)
    await fetchAccounts()
  } finally {
    isRefreshing.value = false
  }
}

// 3. TAKİBİ BIRAK (MODALI TETİKLER)
function openDeleteModal(acc: any) {
  activeMenuId.value = null
  accountToDelete.value = acc
}

async function confirmDeleteAccount() {
  if (!accountToDelete.value) return

  const targetId = accountToDelete.value.id
  deletingId.value = targetId

  try {
    await api.deleteAccount(targetId)
    rawAccounts.value = rawAccounts.value.filter(a => a.id !== targetId)
    accountToDelete.value = null
  } catch (err) {
    console.error('Hesap silinemedi:', err)
    alert('Hesap silinirken bir hata oluştu veya bu işlem için yetkiniz yok.')
  } finally {
    deletingId.value = null
  }
}

async function handleWizardSuccess() {
  isWizardOpen.value = false
  await fetchAccounts()
}

function handleGlobalClick() {
  activeMenuId.value = null
}

onMounted(() => {
  fetchAccounts()
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})

const toggleMenu = (id: string | number) => {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

const accounts = computed(() => {
  return rawAccounts.value.map((acc, idx) => enrichAccount(acc, idx))
})

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
  overflow: hidden;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.account-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px -10px rgba(0,0,0,0.3);
}

/* KART EFEKTİ RENKLERİ VE NEON ÜST ÇİZGİLER */
.account-card.border-grad-orange::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #f97316, #ec4899); border-radius: 16px 16px 0 0;
}
.account-card.border-grad-purple::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #a855f7, #ec4899); border-radius: 16px 16px 0 0;
}
.account-card.border-grad-cyan::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #0284c7, #14b8a6); border-radius: 16px 16px 0 0;
}
.account-card.border-grad-pink::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #ec4899, #a855f7); border-radius: 16px 16px 0 0;
}
.account-card.border-grad-green::before {
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
  flex-shrink: 0;
}

/* AVATAR DEGRADE RENKLERİ */
.bg-orange-red { background: linear-gradient(135deg, #f97316, #ef4444); }
.bg-pink-purple { background: linear-gradient(135deg, #ec4899, #a855f7); }
.bg-teal-cyan { background: linear-gradient(135deg, #14b8a6, #0284c7); }
.bg-purple-blue { background: linear-gradient(135deg, #a855f7, #3b82f6); }
.bg-green-teal { background: linear-gradient(135deg, #10b981, #14b8a6); }

.account-name { font-size: 1.05rem; font-weight: 700; color: var(--foreground); }
.account-handle { font-size: 0.82rem; color: var(--muted-foreground); }

.dropdown-wrapper { position: relative; }

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
  transition: background 0.15s ease;
}

.dropdown-item:hover:not(:disabled) { background: var(--muted); }
.dropdown-item:disabled { opacity: 0.5; cursor: not-allowed; }
.dropdown-item.danger { color: var(--destructive); }
.dropdown-item.danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.12); }

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

.metric-item { display: flex; flex-direction: column; }
.metric-label { font-size: 0.68rem; font-weight: 700; color: var(--muted-foreground); letter-spacing: 0.05em; }
.metric-value { font-size: 1.6rem; font-weight: 400; line-height: 1.2; }

.text-pink { color: var(--brand); }
.text-violet { color: var(--violet); }

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

.detail-link:hover { border-color: var(--border-strong); }

/* SKELETON ANİMASYON STİLLERİ */
.skeleton-card { pointer-events: none; }
.skeleton-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--border);
  animation: pulse 1.5s infinite ease-in-out;
}
.skeleton-line {
  background: var(--border);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}
.skeleton-text-group { display: flex; flex-direction: column; }
.w-12 { width: 48px; }
.w-16 { width: 64px; }
.w-20 { width: 80px; }
.w-24 { width: 96px; }
.w-full { width: 100%; }
.h-3 { height: 12px; }
.h-4 { height: 16px; }
.h-5 { height: 20px; }
.h-8 { height: 32px; }
.h-10 { height: 40px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* ONAY MODALI (CONFIRMATION MODAL) STİLLERİ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-card, 20px);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.modal-icon-box {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0 0 8px 0;
}

.modal-desc {
  font-size: 0.84rem;
  color: var(--muted-foreground);
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.highlight-user {
  color: var(--brand);
  font-weight: 700;
}

.modal-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.btn-cancel {
  flex: 1;
  background: var(--background);
  border: 1px solid var(--border-strong);
  color: var(--foreground);
  padding: 11px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover:not(:disabled) {
  background: var(--surface-hover);
}

.btn-danger-confirm {
  flex: 1;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  color: #fff;
  padding: 11px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
}

.btn-danger-confirm:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-cancel:disabled,
.btn-danger-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>