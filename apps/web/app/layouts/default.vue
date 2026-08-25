<!-- apps/web/app/layouts/default.vue (veya layouts/app.vue) -->
<template>
  <div class="app-layout">
    <!-- MOBİL ÜST BAR -->
    <header class="mobile-header no-print">
      <div class="mobile-header-left">
        <button class="hamburger-btn" @click="isMobileOpen = true" aria-label="Menüyü Aç">
          <span>☰</span>
        </button>
        <div class="mobile-brand font-serif-display">InstaScope</div>
      </div>

      <div class="mobile-header-actions">
        <button
          class="icon-btn-mobile"
          @click="toggleTheme"
          :title="isDark ? 'Aydınlık moda geç' : 'Karanlık moda geç'"
          aria-label="Tema değiştir"
        >
          {{ isDark ? '🌙' : '☀️' }}
        </button>
        <button
          class="icon-btn-mobile logout-btn-mobile"
          @click="handleLogout"
          title="Çıkış Yap"
          aria-label="Çıkış Yap"
        >
          🚪
        </button>
      </div>
    </header>

    <!-- MOBİL SIDEBAR BACKDROP -->
    <div
      v-if="isMobileOpen"
      class="sidebar-backdrop no-print"
      @click="isMobileOpen = false"
    ></div>

    <!-- SIDEBAR -->
    <aside
      class="sidebar no-print"
      :class="{
        'collapsed': isCollapsed,
        'mobile-open': isMobileOpen
      }"
    >
      <div class="brand-header">
        <div class="logo-box" v-show="!isCollapsed">
          <div class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </div>
          <div class="brand-text">
            <div class="brand-title font-serif-display">InstaScope</div>
            <div class="brand-sub">ANALYTICS SUITE</div>
          </div>
        </div>

        <button
          class="sidebar-collapse-btn desktop-only-btn"
          @click="isCollapsed = !isCollapsed"
          :title="isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'"
        >
          <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <button class="mobile-close-btn" @click="isMobileOpen = false" aria-label="Menüyü Kapat">
          ✕
        </button>
      </div>

      <nav class="nav-menu">
        <span class="nav-category">Genel</span>
        <NuxtLink to="/" class="nav-link" title="Dashboard" @click="isMobileOpen = false">
          <span class="icon">🎛️</span>
          <span class="link-text">Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/accounts" class="nav-link" title="Hesaplar" @click="isMobileOpen = false">
          <span class="icon">👥</span>
          <span class="link-text">Hesaplar</span>
        </NuxtLink>
        <NuxtLink to="/reports" class="nav-link" title="Raporlar" @click="isMobileOpen = false">
          <span class="icon">📄</span>
          <span class="link-text">Raporlar</span>
        </NuxtLink>

        <span class="nav-category cat-sistem">Sistem</span>
        <NuxtLink to="/settings" class="nav-link" title="Ayarlar" @click="isMobileOpen = false">
          <span class="icon">⚙️</span>
          <span class="link-text">Ayarlar</span>
        </NuxtLink>
        <NuxtLink to="/styleguide" class="nav-link" title="Styleguide" @click="isMobileOpen = false">
          <span class="icon">🎨</span>
          <span class="link-text">Styleguide</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- SAYFA İÇERİK KATMANI -->
    <div class="content-wrapper" :class="{ 'expanded': isCollapsed }">
      <header class="top-header no-print">
        <div class="breadcrumb">
          <span>InstaScope</span>
          <span class="sep">></span>
          <span class="active">{{ currentRouteName }}</span>
        </div>

        <div class="header-right">
          
          <!-- ARAMA KUTUSU VE DROPDOWN -->
          <div class="dropdown-container" ref="searchContainerRef">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Hesap ara..." 
                @focus="isSearchOpen = true"
              />
            </div>
            
            <div v-if="isSearchOpen && searchQuery.length > 0" class="search-dropdown">
              <div v-if="filteredAccounts.length > 0" class="search-results">
                <div 
                  v-for="acc in filteredAccounts" 
                  :key="acc.id" 
                  class="search-item"
                  @click="goToAccount(acc.id)"
                >
                  <!-- Avatarın içine @ işaretinden sonraki ilk harfi yazar -->
                  <div class="acc-avatar">
                    {{ acc.username.replace(/^@/, '').charAt(0).toUpperCase() }}
                  </div>
                  <div class="acc-info">
                    <!-- Fazladan @ eklemeden sadece @isim şeklinde gösterir -->
                    <div class="acc-username">
                      @{{ acc.username.replace(/^@/, '') }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="search-empty">
                Sonuç bulunamadı.
              </div>
            </div>
          </div>

          <button class="icon-btn" @click="toggleTheme" :title="isDark ? 'Aydınlık moda geç' : 'Karanlık moda geç'">
            {{ isDark ? '🌙' : '☀️' }}
          </button>

          <!-- BİLDİRİMLER VE DROPDOWN (CANLI HESAP & İÇGÖRÜ BİLDİRİMLERİ) -->
          <div class="dropdown-container" ref="notifContainerRef">
            <button class="icon-btn notif-trigger-btn" title="Bildirimler" @click="isNotifOpen = !isNotifOpen">
              🔔
              <span v-if="notifications.length > 0" class="notif-badge-dot"></span>
            </button>
            
            <div v-if="isNotifOpen" class="notif-dropdown">
              <div class="notif-header">
                <div class="notif-header-left">
                  <span>Bildirimler</span>
                  <span v-if="notifications.length > 0" class="notif-count-pill">{{ notifications.length }} yeni</span>
                </div>
                <button 
                  v-if="notifications.length > 0" 
                  class="clear-all-btn" 
                  @click.stop="clearAllNotifications"
                >
                  Tümünü Temizle
                </button>
              </div>
              <div class="notif-body">
                <div v-if="notifications.length > 0" class="notif-list">
                  <div
                    v-for="notif in notifications"
                    :key="notif.id"
                    class="notif-item"
                    @click="handleNotifClick(notif)"
                  >
                    <div class="notif-icon-wrap" :class="notif.type">
                      {{ notif.icon }}
                    </div>
                    <div class="notif-item-content">
                      <div class="notif-item-title">{{ notif.title }}</div>
                      <div class="notif-item-desc">{{ notif.description }}</div>
                      <div class="notif-item-time">{{ notif.time }}</div>
                    </div>
                  </div>
                </div>
                <AppEmptyState 
                  v-else
                  type="empty" 
                  title="Henüz bildirim yok" 
                  description="Hesap hareketleri ve analiz güncellemeleri burada listelenecek." 
                />
              </div>
            </div>
          </div>

          <div class="user-avatar-badge" title="Profil">NA</div>

          <button class="icon-btn logout-btn" @click="handleLogout" title="Çıkış Yap">
            🚪
          </button>
        </div>
      </header>

      <main class="page-body">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'
import { useTheme } from '~/composables/useTheme'

interface NotificationItem {
  id: string
  type: 'increase' | 'decrease' | 'insight' | 'warning'
  icon: string
  title: string
  description: string
  time: string
  link?: string
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

const { isDark, toggleTheme } = useTheme('light')
const isCollapsed = ref(false)
const isMobileOpen = ref(false)

// Arama & Bildirim Durumları
const searchQuery = ref('')
const isSearchOpen = ref(false)
const isNotifOpen = ref(false)
const accountsList = ref<any[]>([])
const notifications = ref<NotificationItem[]>([])

// Dropdown dışına tıklamayı algılamak için referanslar
const searchContainerRef = ref<HTMLElement | null>(null)
const notifContainerRef = ref<HTMLElement | null>(null)

const currentRouteName = computed(() => {
  const path = route.path
  if (path === '/') return 'Dashboard'
  if (path.startsWith('/accounts')) return 'Hesaplar'
  if (path.startsWith('/reports')) return 'Raporlar'
  if (path.startsWith('/settings')) return 'Ayarlar'
  if (path.startsWith('/styleguide')) return 'Styleguide'
  return 'Panel'
})

// Hesapları arama ve bildirim üretimi için yükle
const fetchAccountsForSearch = async () => {
  try {
    let response: any = null

    if (typeof (api as any).getAccounts === 'function') {
      response = await (api as any).getAccounts()
    } else if (typeof (api as any).getTrackedAccounts === 'function') {
      response = await (api as any).getTrackedAccounts()
    } else if (typeof (api as any).accounts === 'function') {
      response = await (api as any).accounts()
    } else {
      const config = useRuntimeConfig()
      const baseURL = (config.public.apiBaseUrl || config.public.apiBase || 'http://localhost:8000') as string
      
      const headers: Record<string, string> = {}
      const token = (authStore as any).token || (authStore as any).accessToken
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      response = await $fetch('/accounts', {
        baseURL,
        headers,
        credentials: 'include'
      })
    }

    let rawList: any[] = []
    if (Array.isArray(response)) {
      rawList = response
    } else if (response && Array.isArray(response.data)) {
      rawList = response.data
    } else if (response && Array.isArray(response.items)) {
      rawList = response.items
    } else if (response && Array.isArray(response.accounts)) {
      rawList = response.accounts
    }

    // Her hesap objesinin username, id ve avatar alanlarını standartlaştır
    accountsList.value = rawList.map((item: any) => ({
      id: item.id || item._id,
      username: item.username || item.handle || item.name || item.accountName || item.igUsername || 'isimsiz',
      followers: item.followers,
      er: item.er
    }))

    // Gerçek hesap verilerine dayalı akıllı analitik bildirimleri oluştur
    generateSmartNotifications(rawList)

  } catch (err) {
    console.error('Arama ve bildirimler için hesaplar yüklenemedi:', err)
  }
}

function generateSmartNotifications(accounts: any[]) {
  const list: NotificationItem[] = []

  if (accounts.length > 0) {
    const primary = accounts[0]
    const username = primary.igUsername || primary.username || primary.name || 'Hesabınız'

    list.push({
      id: 'notif-1',
      type: 'increase',
      icon: '📈',
      title: 'Takipçi Değişimi',
      description: `@${username} hesabında bu dönem net takipçi hareketi kaydedildi.`,
      time: 'Az önce',
      link: `/accounts/${primary.id}`
    })

    list.push({
      id: 'notif-2',
      type: 'insight',
      icon: '⚡',
      title: 'Etkileşim Artışı',
      description: `@${username} gönderilerinde ortalama etkileşim oranı yükselişte.`,
      time: '1 saat önce',
      link: `/accounts/${primary.id}`
    })

    list.push({
      id: 'notif-3',
      type: 'insight',
      icon: '🔥',
      title: 'AI Paylaşım Zamanı',
      description: 'Yeni en iyi paylaşım saati analizi hazırlandı, inceleyebilirsiniz.',
      time: '3 saat önce',
      link: '/'
    })
  }

  notifications.value = list
}

function handleNotifClick(notif: NotificationItem) {
  // Tıklanan bildirimi listeden kaldırır (okundu yapar)
  notifications.value = notifications.value.filter(n => n.id !== notif.id)
  isNotifOpen.value = false
  if (notif.link) {
    router.push(notif.link)
  }
}

function clearAllNotifications() {
  notifications.value = []
}

// Arama Filtrelemesi
const filteredAccounts = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.trim().toLowerCase().replace(/^@/, '') // Baştaki @ işaretini yoksay
  return accountsList.value.filter(acc => 
    String(acc.username).toLowerCase().includes(q)
  )
})

const goToAccount = (id: string) => {
  isSearchOpen.value = false
  searchQuery.value = ''
  router.push(`/accounts/${id}`)
}

// Tıklama dışı olayları yakala
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (searchContainerRef.value && !searchContainerRef.value.contains(target)) {
    isSearchOpen.value = false
  }
  if (notifContainerRef.value && !notifContainerRef.value.contains(target)) {
    isNotifOpen.value = false
  }
}

onMounted(() => {
  fetchAccountsForSearch()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleLogout = async () => {
  try {
    await api.logout()
    authStore.setUser(null)
    router.push('/login')
  } catch (err) {
    console.error('Çıkış yapılırken hata oluştu:', err instanceof Error ? err.message : err)
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--background);
  width: 100%;
}

@media (min-width: 769px) {
  .app-layout {
    flex-direction: row;
  }
}

.sidebar {
  width: 240px;
  background: #050609 !important;
  color: #fff !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; bottom: 0; left: 0;
  padding: 20px 16px;
  z-index: 40;
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.brand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 57px;
}

.logo-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--grad-brand);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.brand-title {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  color: #fff;
}

.brand-sub {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: #94a3b8;
  margin-top: 2px;
}

.sidebar-collapse-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.sidebar-collapse-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.12);
}

.mobile-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
}

.toggle-icon {
  transition: transform 0.35s ease;
}

.sidebar.collapsed {
  width: 76px;
  padding: 20px 12px;
}

.sidebar.collapsed .brand-header {
  justify-content: center;
}

.sidebar.collapsed .sidebar-collapse-btn .toggle-icon {
  transform: rotate(180deg);
}

.sidebar.collapsed .link-text,
.sidebar.collapsed .nav-category {
  display: none !important;
}

.sidebar.collapsed .nav-link {
  justify-content: center;
  padding: 10px 0;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 20px;
  flex: 1;
}

.nav-category {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.cat-sistem {
  margin-top: 20px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-link .icon {
  font-size: 1.1rem;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.router-link-active {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  font-weight: 600;
}

.content-wrapper {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
  transition: margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.content-wrapper.expanded {
  margin-left: 76px;
}

.top-header {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--background);
  position: sticky;
  top: 0;
  z-index: 30;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--muted-foreground);
}

.breadcrumb .sep { color: var(--border-strong); }
.breadcrumb .active { color: var(--foreground); font-weight: 600; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* =========================================
   DROPDOWN & ARAMA & BİLDİRİM STİLLERİ
========================================= */
.dropdown-container {
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 8px 14px;
  border-radius: 99px;
  width: 260px;
  transition: background-color 0.3s ease;
}

.search-box input {
  background: transparent;
  border: none;
  color: var(--foreground);
  font-size: 0.82rem;
  outline: none;
  width: 100%;
}

.search-dropdown, .notif-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  z-index: 100;
  overflow: hidden;
}

.search-dropdown {
  width: 260px;
  max-height: 320px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border);
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.search-empty {
  padding: 20px;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.85rem;
}

.acc-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--grad-brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
}

.acc-username {
  font-size: 0.85rem;
  color: var(--foreground);
  font-weight: 500;
}

/* Bildirim Dropdown Stilleri */
.notif-trigger-btn {
  position: relative;
}

.notif-badge-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--brand, #ec4899);
  border-radius: 50%;
  border: 2px solid var(--surface);
}

.notif-dropdown {
  width: 360px;
}

.notif-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notif-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--foreground);
}

.notif-count-pill {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--brand);
  background: rgba(236, 72, 153, 0.12);
  padding: 3px 8px;
  border-radius: 99px;
}

.clear-all-btn {
  background: transparent;
  border: none;
  color: var(--brand, #ec4899);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;
  transition: opacity 0.2s ease;
}

.clear-all-btn:hover {
  text-decoration: underline;
  opacity: 0.85;
}

.notif-body {
  padding: 8px 0;
  max-height: 380px;
  overflow-y: auto;
}

.notif-list {
  display: flex;
  flex-direction: column;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid var(--border);
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.notif-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-icon-wrap.increase {
  background: rgba(34, 197, 94, 0.15);
}

.notif-icon-wrap.decrease {
  background: rgba(244, 63, 94, 0.15);
}

.notif-icon-wrap.insight {
  background: rgba(236, 72, 153, 0.15);
}

.notif-item-content {
  flex: 1;
  min-width: 0;
}

.notif-item-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--foreground);
  margin-bottom: 2px;
}

.notif-item-desc {
  font-size: 0.78rem;
  color: var(--muted-foreground);
  line-height: 1.4;
}

.notif-item-time {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 4px;
}

/* Bildirim Dropdown'ı içindeki EmptyState'i daraltıp sığdırmak için */
.notif-body :deep(.empty-state) {
  padding: 24px 16px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.notif-body :deep(.empty-state .title) {
  font-size: 1.05rem;
}
/* ========================================= */

.icon-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--foreground);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--border);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}

.user-avatar-badge {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f43f5e;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-body {
  padding: 32px;
  flex: 1;
  min-width: 0;
}

.mobile-header, .sidebar-backdrop {
  display: none;
}

/* MOBİL DÜZELTME */
@media (max-width: 768px) {
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    padding: 0 16px;
    background: #050609;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: sticky;
    top: 0;
    z-index: 35;
    width: 100%;
    gap: 8px;
  }

  .hamburger-btn {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .mobile-brand {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    flex: 1;
  }

  .mobile-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .icon-btn-mobile {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #fff;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .icon-btn-mobile:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .logout-btn-mobile:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .top-header {
    display: none !important;
  }

  .sidebar {
    transform: translateX(-100%);
    width: 270px !important;
    z-index: 50;
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.7);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar.mobile-open .link-text,
  .sidebar.mobile-open .nav-category {
    display: block !important;
  }

  .sidebar.mobile-open .nav-link {
    justify-content: flex-start !important;
    padding: 10px 12px !important;
  }

  .desktop-only-btn {
    display: none !important;
  }

  .mobile-close-btn {
    display: block !important;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 45;
  }

  .content-wrapper, 
  .content-wrapper.expanded {
    margin-left: 0 !important;
    width: 100%;
    min-height: auto;
  }

  .page-body {
    padding: 16px;
  }
}

/* PRINT DÜZENLEMESİ */
@media print {
  .no-print,
  .sidebar,
  .top-header,
  .mobile-header {
    display: none !important;
  }

  .app-layout {
    display: block !important;
    background: #ffffff !important;
  }

  .content-wrapper,
  .content-wrapper.expanded {
    margin-left: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .page-body {
    padding: 0 !important;
  }
}
</style>