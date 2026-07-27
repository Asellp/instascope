import { useRuntimeConfig, useCookie } from '#imports'
import { MOCK_ACCOUNTS, MOCK_REPORTS, type Account, type CreateAccountDto, type Report } from '~/utils/mockData'

export const useApi = () => {
  const config = useRuntimeConfig()
  const isMock = config.public.useMock
  const baseUrl = config.public.apiBaseUrl

  // 🔥 F5 yapınca silinmeyen, tarayıcı çerezinde oturumu saklayan değişken
  const mockAuthCookie = useCookie<{ id: string; email: string; role: 'admin' } | null>('mock_auth_user', {
    default: () => null,
    maxAge: 60 * 60 * 24 // 1 gün boyunca oturumu korur
  })

  // Generic fetch wrapper (Çerezleri otomatik taşıması için credentials: 'include' var)
  const fetchApi = async <T>(endpoint: string, options: Record<string, any> = {}): Promise<T> => {
    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 300))

      if (endpoint === '/accounts') return MOCK_ACCOUNTS as unknown as T
      if (endpoint === '/reports') return MOCK_REPORTS as unknown as T
      return {} as T
    }

    // Gerçek API çağrısında çerezleri otomatik gönderiyoruz
    return $fetch<T>(`${baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include' // httpOnly çerezi istekte otomatik taşır
    })
  }

  return {
    isMock,

    // 1. GİRİŞ YAP (POST /auth/login)
    login: async (email: string, pass: string) => {
      if (isMock) {
        // 🔥 Loading çarkını ve animasyonu rahatça görebilmek için 1.5 sn bekletiyoruz
        await new Promise(r => setTimeout(r, 1500)) 
        if (email === 'admin@instascope.io' && pass === '123456') {
          const mockUser = { id: 'usr_1', email: 'admin@instascope.io', role: 'admin' as const }
          mockAuthCookie.value = mockUser
          return { user: mockUser }
        } else {
          throw new Error('E-posta veya şifre hatalı! (Test: admin@instascope.io / 123456)')
        }
      }

      return $fetch<{ user: any }>(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: { email, password: pass },
        credentials: 'include'
      })
    },
    // 2. OTURUM DURUMU KONTROLÜ (GET /auth/me)
    getMe: async () => {
      if (isMock) {
        // Çerezde oturum yoksa hata fırlatır ve middleware /login'e atar
        if (!mockAuthCookie.value) {
          throw new Error('Oturum bulunamadı')
        }
        return { user: mockAuthCookie.value }
      }

      return $fetch<{ user: any }>(`${baseUrl}/auth/me`, {
        method: 'GET',
        credentials: 'include'
      })
    },

    // 3. ÇIKIŞ YAP (POST /auth/logout)
    logout: async () => {
      if (isMock) {
        // Çıkış yapıldığında çerezi temizliyoruz
        mockAuthCookie.value = null
        return { success: true }
      }

      return $fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    },

    // Diğer mock fonksiyonlar
    getAccounts: () => fetchApi<Account[]>('/accounts'),
    createAccount: (data: CreateAccountDto) => fetchApi<Account>('/accounts', { method: 'POST', body: data }),
    deleteAccount: (id: string | number) => fetchApi<{ success: boolean }>(`/accounts/${id}`, { method: 'DELETE' }),
    getReports: () => fetchApi<Report[]>('/reports')
  }
}