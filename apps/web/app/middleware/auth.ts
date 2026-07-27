import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  const api = useApi()

  // 1. Eğer kullanıcı Pinia belleğinde yoksa çerez üzerinden kontrol et
  if (!authStore.user) {
    try {
      const res = await api.getMe()
      authStore.setUser(res.user)
    } catch {
      authStore.setUser(null)
    }
  }

  // 2. Giriş yapılmadıysa VE korunan bir sayfaya gitmeye çalışıyorsa -> /login
  if (!authStore.isAuthenticated && to.path !== '/login' && to.path !== '/register') {
    return navigateTo('/login', { replace: true })
  }

  // 3. Giriş yapılmışsa VE login/register sayfasına gitmeye çalışıyorsa -> / (Dashboard)
  if (authStore.isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/', { replace: true })
  }
})