import { defineNuxtPlugin, navigateTo, useRoute } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

/**
 * SSR sırasında middleware/auth.ts BİLEREK pas geçiliyor (bkz. oradaki not) —
 * çünkü backend'in auth cookie'si farklı origin'de ve Nuxt sunucusuna hiç
 * ulaşmıyor. Bu plugin, tarayıcı uygulamayı ayağa kaldırdığında (ilk
 * yükleme VEYA F5 ile sayfa yenileme) BİR KEZ çalışır ve gerçek oturum
 * durumunu client-side `credentials: 'include'` ile doğrular — çünkü
 * tarayıcı artık cookie'yi doğru origin'e (ngrok'a) gönderebilir.
 *
 * `.client.ts` uzantısı Nuxt'a bu plugin'in SADECE tarayıcıda çalışacağını
 * söyler; sunucu tarafında hiç çalıştırılmaz.
 */
export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  const api = useApi()
  const route = useRoute()

  // Mock modda oturum zaten client-side cookie (mock_auth_user) ile
  // yönetiliyor, bu plugin'e gerek yok.
  if (api.isMock) return

  try {
    const res = await api.getMe()
    authStore.setUser(res.user)
  } catch {
    authStore.setUser(null)

    const publicPages = ['/login', '/register', '/forgot-password', '/reset-password']
    const isAuthPage = publicPages.includes(route.path)
    if (!isAuthPage) {
      await navigateTo('/login', { replace: true })
    }
  }
})