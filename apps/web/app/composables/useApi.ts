// apps/web/app/composables/useApi.ts

import { useRuntimeConfig, useCookie, useRequestHeaders } from '#imports'
import type { User, CreateAccountDto } from '@instascope/shared'
import {
  MOCK_ACCOUNTS, MOCK_REPORTS, type Account, type Report,
  generateTimeSeries, generateAccountPosts, generateBestTimes, generateMockOverview,
  generateMockSentiment,
  type TimeSeriesPoint, type ContentMixSlice, type ContentTypePerformance,
  type PostItem, type PostSortOption, type PostTypeFilter, type AccountOverview,
  type HashtagStat, type BestTimeSlot
} from '~/utils/mockData'
import {
  AVATAR_STYLES, SOURCE_LABEL, FREQ_INTERVAL,
  mapAccount, mapOverview, mapSentimentResponse, type SentimentData,
  mapAccountMetricsToSeries, deriveEngagementTimeseries,
  mapPost, deriveContentMix, deriveContentPerformance,
  mapTopicsResponse, mockTopicsData, type TopicsData,
  mapLikesBaselineResponse, type LikesBaselineData,
  mapSpamResponse, type SpamData,
  mapSentimentReasons, type SentimentReason
} from '~/utils/apiMappers'

let mockAccountsStore: (Account & { _createdAt?: number })[] = [...MOCK_ACCOUNTS]
const postsCache = new Map<string, Promise<PostItem[]>>()

function hydrateMockAccount(dto: CreateAccountDto): Account & { _createdAt: number } {
  const style = AVATAR_STYLES[mockAccountsStore.length % AVATAR_STYLES.length]
  const username = dto.username.replace('@', '')
  return {
    id: `acc_${Date.now()}`,
    igUsername: username,
    sourceType: dto.sourceType,
    name: username,
    handle: `@${username}`,
    slug: username.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    avatar: username.slice(0, 2).toUpperCase(),
    ...style,
    source: SOURCE_LABEL[dto.sourceType] ?? 'Mock',
    status: 'Toplanıyor',
    interval: FREQ_INTERVAL[dto.frequency] ?? 'Bilinmiyor',
    followers: '—',
    er: '—',
    erClass: 'text-muted',
    _createdAt: Date.now()
  }
}

function isForbiddenError(err: any): boolean {
  return err?.response?.status === 403 || err?.statusCode === 403
}

/**
 * TEK, ORTAK İSTEK BAŞLIĞI FONKSİYONU
 */
function apiHeaders(baseUrl: string): Record<string, string> {
  const headers: Record<string, string> = {}

  if (baseUrl.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true'
  }

  if (process.server) {
    Object.assign(headers, useRequestHeaders(['cookie']))
  }
  return headers
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const isMock = config.public.useMock
  const baseUrl = config.public.apiBaseUrl

  const mockAuthCookie = useCookie<User | null>('mock_auth_user', {
    default: () => null,
    maxAge: 60 * 60 * 24
  })

  async function fetchOverview(accountId: string | number, range = '30d'): Promise<AccountOverview | undefined> {
    if (isMock) {
      return generateMockOverview(accountId, range)
    }
    try {
      const raw = await $fetch<any>(`${baseUrl}/accounts/${accountId}/overview?range=${range}`, {
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return mapOverview(raw)
    } catch (err) {
      console.error(`Overview yükleme hatası (${accountId}):`, err)
      return undefined
    }
  }

  function getPostsPageCached(
    accountId: string | number,
    opts: { sort?: PostSortOption; type?: PostTypeFilter; cursor?: string; limit?: number } = {}
  ): Promise<PostItem[]> {
    const key = `${accountId}:${opts.sort ?? 'date'}:${opts.type ?? 'all'}:${opts.cursor ?? ''}:${opts.limit ?? ''}`
    if (!postsCache.has(key)) {
      const promise = isMock
        ? Promise.resolve(generateAccountPosts(accountId))
        : (async () => {
            const params = new URLSearchParams({
              limit: String(Math.min(opts.limit ?? 50, 50))
            })
            if (opts.cursor) {
              params.set('cursor', opts.cursor)
            }
            try {
              const raw = await $fetch<{ data: any[]; meta: any } | any[]>(
                `${baseUrl}/accounts/${accountId}/posts?${params.toString()}`,
                { 
                  credentials: 'include', 
                  headers: apiHeaders(baseUrl) 
                }
              )
              const rawList = Array.isArray(raw) ? raw : (raw.data ?? [])
              return rawList.map(r => mapPost(r, accountId))
            } catch (err) {
              console.error(`Gönderi listesi yükleme hatası (${accountId}):`, err)
              return []
            }
          })()
      postsCache.set(key, promise)
    }
    return postsCache.get(key)!
  }

  return {
    isMock,

    // ===== AUTH =====

    login: async (email: string, pass: string) => {
      if (isMock) {
        await new Promise(r => setTimeout(r, 1500))
        if (email === 'admin@instascope.io' && pass === '123456') {
          const mockUser: User = { id: 'usr_1', email: 'admin@instascope.io', name: 'Admin User' }
          mockAuthCookie.value = mockUser
          return { user: mockUser }
        }
        throw new Error('E-posta veya şifre hatalı! (Test: admin@instascope.io / 123456)')
      }
      const res = await $fetch<any>(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: { email, password: pass },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return { user: res.user ?? res }
    },

    register: async (name: string, email: string, pass: string) => {
      if (isMock) {
        await new Promise(r => setTimeout(r, 1200))
        const mockUser: User = { id: `usr_${Date.now()}`, email, name }
        mockAuthCookie.value = mockUser
        return { user: mockUser }
      }
      const res = await $fetch<any>(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: { name, email, password: pass },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return { user: res.user ?? res }
    },

    getMe: async () => {
      if (isMock) {
        if (!mockAuthCookie.value) throw new Error('Oturum bulunamadı')
        return { user: mockAuthCookie.value }
      }
      const res = await $fetch<any>(`${baseUrl}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return { user: res.user ?? res }
    },

    logout: async () => {
      if (isMock) { mockAuthCookie.value = null; return { success: true } }
      await $fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return { success: true }
    },

    refresh: async () => {
      if (isMock) return { success: true }
      await $fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken: '' },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return { success: true }
    },

    forgotPassword: async (email: string) => {
      if (isMock) {
        await new Promise(r => setTimeout(r, 800))
        return { message: 'Eğer kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.' }
      }
      return await $fetch<{ message: string }>(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        body: { email },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
    },

    resetPassword: async (token: string, newPassword: string) => {
      if (isMock) {
        await new Promise(r => setTimeout(r, 800))
        return { message: 'Şifreniz başarıyla güncellendi.' }
      }
      return await $fetch<{ message: string }>(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        body: { token, newPassword },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
    },

    // ===== ACCOUNTS =====

    getAccounts: async (): Promise<Account[]> => {
      if (isMock) return [...mockAccountsStore]
      try {
        const raw = await $fetch<any[]>(`${baseUrl}/accounts`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        const withOverview = await Promise.all(
          raw.map(async (r, i) => {
            const overview = await fetchOverview(r.id)
            return mapAccount(r, overview, i)
          })
        )
        return withOverview
      } catch (err) {
        if (isForbiddenError(err)) throw new Error('FORBIDDEN')
        throw err
      }
    },

    getAccountById: async (id: string | number): Promise<Account> => {
      if (isMock) {
        const found = mockAccountsStore.find(a => String(a.id) === String(id) || a.slug === String(id) || a.igUsername === String(id))
        if (!found) throw new Error('Hesap bulunamadı')
        if (found.status === 'Toplanıyor' && Date.now() - (found._createdAt ?? 0) > 4000) {
          found.status = 'Aktif'
          found.followers = `${(Math.random() * 50 + 5).toFixed(1)}K`
          found.er = `${(Math.random() * 8 + 2).toFixed(2)}%`
          found.erClass = 'text-pink'
        }
        return found
      }
      const raw = await $fetch<any>(`${baseUrl}/accounts/${id}`, {
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      const overview = await fetchOverview(id)
      return mapAccount(raw, overview)
    },

    createAccount: async (data: CreateAccountDto): Promise<Account> => {
      if (isMock) {
        const newAccount = hydrateMockAccount(data)
        mockAccountsStore.push(newAccount)
        return newAccount
      }
      const raw = await $fetch<any>(`${baseUrl}/accounts`, {
        method: 'POST',
        body: {
          ...data,
          username: data.username.trim().replace(/^@/, ''),
          sourceType: data.sourceType.toUpperCase()
        },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return mapAccount(raw)
    },

    deleteAccount: async (id: string | number) => {
      if (isMock) {
        mockAccountsStore = mockAccountsStore.filter(a => String(a.id) !== String(id))
        return { success: true }
      }
      try {
        await $fetch(`${baseUrl}/accounts/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        return { success: true }
      } catch (err) {
        if (isForbiddenError(err)) throw new Error('FORBIDDEN')
        throw err
      }
    },

    // ===== ANALİTİK, KONU MODELLEME & DUYGU ANALİZİ =====

    getAccountOverview: (accountId: string | number, range = '30d') => fetchOverview(accountId, range),

    getFollowerTimeseries: async (accountId: string | number, range: 7 | 30 | 90 = 30) => {
      if (isMock) return generateTimeSeries(accountId, 'followers', range)
      try {
        const raw = await $fetch<any[]>(`${baseUrl}/accounts/${accountId}/metrics`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        const series = mapAccountMetricsToSeries(raw, 'followers', range)
        if (series.length >= 2) return series

        const ov = await fetchOverview(accountId, `${range}d`)
        if (!ov || (ov.followerGrowth.start === 0 && ov.followerGrowth.end === 0)) {
          return series
        }
        const today = new Date()
        const startDate = new Date(today.getTime() - range * 24 * 60 * 60 * 1000)
        return [
          { date: startDate.toISOString(), value: ov.followerGrowth.start },
          { date: today.toISOString(), value: ov.followerGrowth.end }
        ]
      } catch (err) {
        console.error(`Takipçi zaman serisi yükleme hatası (${accountId}):`, err)
        return []
      }
    },

    getEngagementTimeseries: async (accountId: string | number, range: 7 | 30 | 90 = 30) => {
      if (isMock) return generateTimeSeries(accountId, 'engagement', range)
      const posts = await getPostsPageCached(accountId)
      return deriveEngagementTimeseries(posts, range)
    },

    getContentMix: async (accountId: string | number): Promise<ContentMixSlice[]> => {
      const posts = await getPostsPageCached(accountId)
      return deriveContentMix(posts)
    },

    getContentPerformance: async (accountId: string | number): Promise<ContentTypePerformance[]> => {
      const posts = await getPostsPageCached(accountId)
      return deriveContentPerformance(posts)
    },

    getAccountPosts: (
      accountId: string | number,
      options?: { sort?: PostSortOption; type?: PostTypeFilter; cursor?: string; limit?: number }
    ): Promise<PostItem[]> => {
      return getPostsPageCached(accountId, options)
    },

    getSentimentData: async (accountId: string | number): Promise<SentimentData> => {
      if (isMock) {
        return generateMockSentiment(accountId)
      }
      const raw = await $fetch<any[]>(`${baseUrl}/accounts/${accountId}/sentiment`, {
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
      return mapSentimentResponse(raw)
    },

    getSentimentReasons: async (accountId: string | number): Promise<SentimentReason[]> => {
      if (isMock) {
        return [
          {
            postId: `post_${accountId}_1`,
            caption: 'Yaz kampanyası lansmanı 🚀',
            dominantLabel: 'positive',
            commentCount: 24,
            keywords: [
              { word: 'harika', count: 8 },
              { word: 'başarılı', count: 5 },
              { word: 'kalite', count: 3 }
            ]
          },
          {
            postId: `post_${accountId}_2`,
            caption: 'Perde arkası — atölye günlüğü 🎥',
            dominantLabel: 'neutral',
            commentCount: 12,
            keywords: [
              { word: 'atölye', count: 3 },
              { word: 'merak', count: 2 }
            ]
          },
          {
            postId: `post_${accountId}_3`,
            caption: 'Yeni koleksiyon tanıtımı ✨',
            dominantLabel: 'negative',
            commentCount: 9,
            keywords: [
              { word: 'kargo', count: 4 },
              { word: 'gecikme', count: 3 },
              { word: 'pahalı', count: 2 }
            ]
          }
        ]
      }
      try {
        const raw = await $fetch<any[]>(`${baseUrl}/accounts/${accountId}/sentiment-reasons`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        return mapSentimentReasons(raw)
      } catch (err) {
        console.error('Sentiment reasons yükleme hatası:', err)
        return []
      }
    },

    /**
     * GET /accounts/:id/topics — BERTopic Konu Modelleme (F3.2)
     */
    getTopics: async (accountId: string | number): Promise<TopicsData> => {
      if (isMock) {
        return mockTopicsData()
      }
      try {
        const raw = await $fetch<any>(`${baseUrl}/accounts/${accountId}/topics`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        return mapTopicsResponse(raw)
      } catch (err) {
        console.error('Topics çekilemedi, varsayılan dönülüyor:', err)
        return mockTopicsData()
      }
    },

    getHashtags: async (accountId: string | number): Promise<HashtagStat[]> => {
      if (isMock) return []
      try {
        return await $fetch<HashtagStat[]>(`${baseUrl}/accounts/${accountId}/hashtags`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
      } catch (err) {
        console.error('Hashtag yükleme hatası:', err)
        return []
      }
    },

    getLikesBaseline: async (accountId: string | number): Promise<LikesBaselineData | null> => {
      if (isMock) {
        return {
          mae: 8500 + Math.random() * 2000,
          naiveMae: 10000 + Math.random() * 2000,
          modelType: 'ridge',
          beatsNaive: true,
          sampleSize: 2,
          createdAt: new Date().toISOString()
        }
      }
      try {
        const raw = await $fetch<any>(`${baseUrl}/accounts/${accountId}/likes-baseline`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        return mapLikesBaselineResponse(raw)
      } catch (err) {
        console.error('Likes baseline yükleme hatası:', err)
        return null
      }
    },


    predictLikes: async (accountId: string | number, payload: {
      hour: number
      dayOfWeek: number
      caption: string
      contentType: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
    }): Promise<{ predicted_likes: number }> => {
      if (isMock) {
        await new Promise(r => setTimeout(r, 600))
        const base = 1200 + Math.random() * 800
        const multiplier = payload.contentType === 'VIDEO' ? 1.4 : payload.contentType === 'CAROUSEL' ? 1.2 : 1.0
        return { predicted_likes: Math.round(base * multiplier) }
      }
      return await $fetch<{ predicted_likes: number }>(`${baseUrl}/accounts/${accountId}/predict-likes`, {
        method: 'POST',
        body: {
          hour: payload.hour,
          day_of_week: payload.dayOfWeek,
          caption: payload.caption,
          content_type: payload.contentType
        },
        credentials: 'include',
        headers: apiHeaders(baseUrl)
      })
    },

    getSpamAnalysis: async (accountId: string | number): Promise<SpamData> => {
      if (isMock) {
        return {
          totalComments: 119,
          totalFlagged: 0,
          flaggedPercentage: 0,
          flaggedComments: []
        }
      }
      try {
        const raw = await $fetch<any>(`${baseUrl}/accounts/${accountId}/spam-summary`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
        return mapSpamResponse(raw)
      } catch (err) {
        console.error('Spam analizi yükleme hatası:', err)
        return { totalComments: 0, totalFlagged: 0, flaggedPercentage: 0, flaggedComments: [] }
      }
    },

    getBestTimes: async (accountId: string | number): Promise<BestTimeSlot[]> => {
      if (isMock) return generateBestTimes(accountId)
      try {
        const raw = await $fetch<{ heatmap?: BestTimeSlot[]; message?: string }>(
          `${baseUrl}/accounts/${accountId}/best-times`,
          { credentials: 'include', headers: apiHeaders(baseUrl) }
        )
        if (!raw.heatmap) {
          console.info(`Best-times veri yok (${accountId}):`, raw.message)
          return []
        }
        return raw.heatmap
      } catch (err) {
        console.error('Best-times yükleme hatası:', err)
        return []
      }
    },

    getReports: async (): Promise<Report[]> => {
      if (isMock) return MOCK_REPORTS
      try {
        return await $fetch<Report[]>(`${baseUrl}/reports`, {
          credentials: 'include',
          headers: apiHeaders(baseUrl)
        })
      } catch {
        return []
      }
    }
  }
}