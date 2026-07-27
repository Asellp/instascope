import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  email: string
  role: 'admin' | 'viewer'
}

export const useAuthStore = defineStore('auth', () => {
  // 1. State: Sadece kullanıcı profil verisini tutuyoruz (Token çerezde!)
  const user = ref<User | null>(null)

  // 2. Getters: Kullanıcı bilgisi var mı kontrolü
  const isAuthenticated = computed(() => !!user.value)

  // 3. Actions
  function setUser(userData: User | null) {
    user.value = userData
  }

  function logout() {
    user.value = null
    // Router ile login'e atıyoruz
    const router = useRouter()
    router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    setUser,
    logout
  }
})