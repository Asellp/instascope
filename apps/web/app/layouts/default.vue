<template>
  <div class="app-layout">
    <!-- Sol Sabit Koyu Sidebar -->
    <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
      <!-- Brand Header & Entegre Toggle Butonu -->
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

        <!-- Entegre Minimalist Daraltma Butonu -->
        <button 
          class="sidebar-collapse-btn" 
          @click="isCollapsed = !isCollapsed" 
          :title="isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'"
        >
          <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <!-- Navigasyon Menüsü -->
      <nav class="nav-menu">
        <span class="nav-category">Genel</span>
        <NuxtLink to="/" class="nav-link" title="Dashboard">
          <span class="icon">🎛️</span>
          <span class="link-text">Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/accounts" class="nav-link" title="Hesaplar">
          <span class="icon">👥</span>
          <span class="link-text">Hesaplar</span>
        </NuxtLink>
        <NuxtLink to="/reports" class="nav-link" title="Raporlar">
          <span class="icon">📄</span>
          <span class="link-text">Raporlar</span>
        </NuxtLink>

        <span class="nav-category cat-sistem">Sistem</span>
        <NuxtLink to="/settings" class="nav-link" title="Ayarlar">
          <span class="icon">⚙️</span>
          <span class="link-text">Ayarlar</span>
        </NuxtLink>
        <NuxtLink to="/styleguide" class="nav-link" title="Styleguide">
          <span class="icon">🎨</span>
          <span class="link-text">Styleguide</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Sağ Taraf Scrollable İçerik -->
    <div class="content-wrapper" :class="{ 'expanded': isCollapsed }">
      <!-- Top Header Bar -->
      <header class="top-header">
        <div class="breadcrumb">
          <span>InstaScope</span>
          <span class="sep">></span>
          <span class="active">{{ currentRouteName }}</span>
        </div>

        <div class="header-right">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Hesap, gönderi, hashtag ara..." />
          </div>

          <!-- Tema Değiştirme Butonu -->
          <button class="icon-btn" @click="toggleTheme" :title="isDark ? 'Aydınlık moda geç' : 'Karanlık moda geç'">
            {{ isDark ? '🌙' : '☀️' }}
          </button>
          
          <button class="icon-btn" title="Bildirimler">🔔</button>
          
          <!-- Kullanıcı Profil Avatarı -->
          <div class="user-avatar-badge" title="Profil">NA</div>

          <!-- ÇIKIŞ YAP BUTONU -->
          <button class="icon-btn logout-btn" @click="handleLogout" title="Çıkış Yap">
            🚪
          </button>
        </div>
      </header>

      <!-- Sayfa İçeriği -->
      <main class="page-body">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

const isDark = ref(false)
const isCollapsed = ref(false)

const currentRouteName = computed(() => {
  const path = route.path
  if (path === '/') return 'Dashboard'
  if (path.startsWith('/accounts')) return 'Hesaplar'
  if (path.startsWith('/reports')) return 'Raporlar'
  if (path.startsWith('/settings')) return 'Ayarlar'
  if (path.startsWith('/styleguide')) return 'Styleguide'
  return 'Panel'
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

// Çıkış Yap İşlemi
const handleLogout = async () => {
  try {
    await api.logout()
    authStore.setUser(null)
    router.push('/login')
  } catch (err) {
    console.error('Çıkış yapılırken hata oluştu:', err)
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  isDark.value = savedTheme === 'dark'
  document.documentElement.setAttribute('data-theme', savedTheme)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--background);
}

/* --- SIDEBAR TEMEL YAPISI --- */
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
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

/* BRAND HEADER & ENTEGRE BUTON */
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

/* MİNİMALİST İÇ TOGGLE BUTONU */
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

.toggle-icon {
  transition: transform 0.35s ease;
}

/* 🔒 DARALTILMIŞ (COLLAPSED) SIDEBAR DURUMU */
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

/* NAVİGASYON MENÜSÜ */
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

/* --- SAĞ İÇERİK ALANI (CONTENT WRAPPER) --- */
.content-wrapper {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.content-wrapper.expanded {
  margin-left: 76px;
}

/* HEADER & SAYFA GÖVDESİ */
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
}

.page-body {
  padding: 32px;
  flex: 1;
}
</style>