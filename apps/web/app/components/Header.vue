<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'
import { useRouter } from '#imports'

const authStore = useAuthStore()
const api = useApi()
const router = useRouter()

// Çıkış Yap Fonksiyonu
const handleLogout = async () => {
  try {
    await api.logout()
    authStore.setUser(null)
    router.push('/login')
  } catch (err) {
    console.error('Çıkış yapılırken hata oluştu:', err)
  }
}
</script>

<template>
  <header class="h-16 border-b border-gray-800 bg-[#0d0e12]/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
    <!-- Sol Taraf: Breadcrumb / Sayfa Başlığı -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span class="text-gray-200 font-medium">InstaScope</span>
      <span>&gt;</span>
      <span class="text-gray-400">Dashboard</span>
    </div>

    <!-- Sağ Taraf: Arama, Bildirim, Profil ve Çıkış Butonu -->
    <div class="flex items-center gap-4">
      <!-- Arama Çubuğu -->
      <div class="relative w-64 hidden sm:block">
        <input 
          type="text" 
          placeholder="Hesap, gönderi, hashtag ara..." 
          class="w-full bg-[#16181e] text-xs text-gray-200 placeholder-gray-500 rounded-full pl-9 pr-4 py-2 border border-gray-800 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        <svg class="w-4 h-4 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Bildirim Simgesi -->
      <button class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors relative">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
        </svg>
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
      </button>

      <!-- Profil Avatarı -->
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-semibold text-xs flex items-center justify-center shadow-md">
        NA
      </div>

      <!-- ÇIKIŞ YAP BUTONU -->
      <button 
        @click="handleLogout"
        class="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Çıkış Yap"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  </header>
</template>