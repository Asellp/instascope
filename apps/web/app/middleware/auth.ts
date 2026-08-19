import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

export default defineNuxtRouteMiddleware(async (to) => {
  /**
   * KRİTİK MİMARİ NOT (F2.1 "oturum sayfa yenilenince düşmüyor" DoD'si):
   *
   * Auth cookie'si backend'in (ngrok) domain'ine ait — frontend'inkinden
   * (localhost) FARKLI bir origin. Tarayıcı bu cookie'yi SADECE doğrudan
   * o domain'e (ngrok'a) giden isteklere ekler; Nuxt SUNUCUSUNA
   * (localhost:3000) giden ilk sayfa isteğine ASLA eklemez, çünkü cookie
   * o origin'e ait değil. Yani SSR sırasında (sunucuda) elimizde iletecek
   * bir cookie YOK — bu teknik bir imkânsızlık, kod hatası değil.
   *
   * SSR'da zorla "giriş yapılmamış" varsayıp /login'e yönlendirmek YANLIŞ
   * POZİTİF üretiyordu (oturum gerçekte açıkken bile). Bu yüzden SSR'da bu
   * middleware'i tamamen pas geçiyoruz. Gerçek doğrulama ve gerekirse
   * yönlendirme artık plugins/auth.client.ts içinde, tarayıcı hydrate
   * olduktan SONRA (cookie'nin gerçekten gönderilebildiği an) yapılıyor.
   *
   * Bu middleware, ilk yüklemeden SONRAKİ client-side navigasyonlarda
   * (NuxtLink ile sayfa geçişlerinde) normal şekilde çalışmaya devam eder —
   * o an tarayıcı zaten hydrate olmuştur ve credentials:'include' cross-origin
   * isteklerde cookie'yi doğru şekilde gönderir.
   */

  if (process.server) return

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