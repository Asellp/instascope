// apps/web/app/utils/mockData.ts

export interface Account {
  id: string | number
  igUsername: string
  sourceType: string
  accessTokenEnc?: string
  // Frontend UI Display Fields
  name: string
  handle: string
  slug: string
  avatar: string
  avatarBg: string
  borderClass: string
  source: 'API' | 'Scrape' | 'Mock'
  status: 'Aktif' | 'Toplanıyor' | 'Hata'
  interval: string
  followers: string
  er: string
  erClass: string
}

export interface Report {
  id: number
  title: string
  date: string
  accounts: string
  type: 'Otomatik' | 'Özel'
}

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: '1',
    igUsername: 'atolye.studio',
    sourceType: 'instagram',
    name: 'Atölye Studio',
    handle: '@atolye.studio',
    slug: 'atolye-studio',
    avatar: 'AT',
    avatarBg: 'bg-orange-red',
    borderClass: 'border-grad-orange',
    source: 'API',
    status: 'Aktif',
    interval: '6 saatte bir',
    followers: '184.2K',
    er: '6.42%',
    erClass: 'text-pink'
  },
  {
    id: '2',
    igUsername: 'zeynepyilmaz',
    sourceType: 'instagram',
    name: 'Zeynep Yılmaz',
    handle: '@zeynepyilmaz',
    slug: 'zeynep-yilmaz',
    avatar: 'ZE',
    avatarBg: 'bg-pink-purple',
    borderClass: 'border-grad-purple',
    source: 'Scrape',
    status: 'Aktif',
    interval: '12 saatte bir',
    followers: '92.7K',
    er: '8.11%',
    erClass: 'text-violet'
  },
  {
    id: '3',
    igUsername: 'rakip.marka',
    sourceType: 'instagram',
    name: 'Rakip Marka',
    handle: '@rakip.marka',
    slug: 'competitor',
    avatar: 'RA',
    avatarBg: 'bg-teal-cyan',
    borderClass: 'border-grad-cyan',
    source: 'Scrape',
    status: 'Toplanıyor',
    interval: '24 saatte bir',
    followers: '—',
    er: '—',
    erClass: 'text-muted'
  },
  {
    id: '4',
    igUsername: 'demo.hesap',
    sourceType: 'instagram',
    name: 'Demo Hesap',
    handle: '@demo.hesap',
    slug: 'demo-hesap',
    avatar: 'DE',
    avatarBg: 'bg-purple-blue',
    borderClass: 'border-grad-pink',
    source: 'Mock',
    status: 'Aktif',
    interval: '1 saatte bir',
    followers: '12.4K',
    er: '4.05%',
    erClass: 'text-orange'
  }
]

export const MOCK_REPORTS: Report[] = [
  {
    id: 1,
    title: 'Haftalık Özet — Hafta 29',
    date: '15-21 Tem 2026',
    accounts: '4 hesap',
    type: 'Otomatik'
  },
  {
    id: 2,
    title: 'Aylık Performans — Haziran',
    date: '1-30 Haz 2026',
    accounts: '4 hesap',
    type: 'Otomatik'
  },
  {
    id: 3,
    title: 'Kampanya Raporu — Yaz Lansmanı',
    date: '10-24 Haz 2026',
    accounts: '2 hesap',
    type: 'Özel'
  },
  {
    id: 4,
    title: 'Rakip Analizi Q2',
    date: '1 Nis - 30 Haz 2026',
    accounts: '3 hesap',
    type: 'Özel'
  }
]

// ============ ZAMAN SERİSİ VE GRAFİK VERİ TİPLERİ ============

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface ContentMixSlice {
  label: string
  value: number
  color: string
}

export interface ContentTypePerformance {
  label: string
  avgEngagement: number
}

function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function generateTimeSeries(
  accountId: string | number,
  metric: 'followers' | 'engagement' | 'reach',
  range: number
): TimeSeriesPoint[] {
  const rand = seededRandom(`${accountId}-${metric}`)

  const baseByMetric: Record<string, number> = {
    followers: 8000 + rand() * 180000,
    engagement: 2 + rand() * 8,
    reach: 50000 + rand() * 2000000
  }

  let current = baseByMetric[metric]
  const volatility = current * 0.045
  const trendBias = metric === 'engagement' ? 0 : current * 0.0015

  const points: TimeSeriesPoint[] = []
  const today = new Date()

  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const noise = (rand() - 0.5) * volatility
    current = Math.max(0, current + trendBias + noise)

    points.push({
      date: formatDate(date),
      value: metric === 'engagement' ? Number(current.toFixed(2)) : Math.round(current)
    })
  }

  return points
}

export function generateContentMix(accountId: string | number): ContentMixSlice[] {
  const rand = seededRandom(`${accountId}-content-mix`)

  const reel = 35 + rand() * 30
  const foto = 15 + rand() * 25
  const carousel = Math.max(5, 100 - reel - foto)

  return [
    { label: 'Reel', value: Math.round(reel), color: '#ec4899' },
    { label: 'Foto', value: Math.round(foto), color: '#a855f7' },
    { label: 'Carousel', value: Math.round(carousel), color: '#06b6d4' }
  ]
}

export function generateContentTypePerformance(accountId: string | number): ContentTypePerformance[] {
  const rand = seededRandom(`${accountId}-content-perf`)

  return [
    { label: 'Reel', avgEngagement: Number((5 + rand() * 6).toFixed(2)) },
    { label: 'Carousel', avgEngagement: Number((3 + rand() * 5).toFixed(2)) },
    { label: 'Foto', avgEngagement: Number((2 + rand() * 4).toFixed(2)) }
  ]
}

// ============ GÖNDERİ (POST) MOCK VERİ TİPLERİ VE ÜRETİCİSİ ============

export interface PostMetric {
  likes: number
  commentsCount: number
  views: number
  reach: number
  engagementRate: number
}

export interface PostItem {
  id: string
  accountId: string | number
  igMediaId: string
  type: 'reel' | 'image' | 'carousel'
  caption: string
  postedAt: string
  permalink: string
  thumbnailUrl: string
  imageUrl?: string
  metrics: PostMetric
}

export function generateAccountPosts(accountId: string | number): PostItem[] {
  const rand = seededRandom(`posts-seed-${accountId}`)
  const postTypes: ('reel' | 'image' | 'carousel')[] = ['reel', 'image', 'carousel']

  const sampleCaptions = [
    `@${accountId} hesabından yeni paylaşım! Detaylar için profildeki bağlantıya tıkla 🚀 #instascope`,
    'Haftanın en çok etkileşim alan içeriği! Sizce nasıl olmuş? 👇',
    'Ekip olarak bu ay elde ettiğimiz harika sonuçlar 📊 Herkese teşekkürler!',
    'Minimalist tasarım ilkeleri üzerine hazırladığımız rehber yayında 🎨 #design',
    'Yeni ürün lansmanımızdan kareler! Geceye kadar çalışmaya devam ☕️ #engineering',
    'Pazar modu ☀️ Yeni haftaya hazırsanız yorumlarda buluşalım!'
  ]

  const sampleThumbnails = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=400&auto=format&fit=crop&q=80'
  ]

  const postsCount = 10
  const posts: PostItem[] = []
  const now = new Date()

  const baseMultiplier = (String(accountId).charCodeAt(0) || 5) * 120

  for (let i = 0; i < postsCount; i++) {
    const type = postTypes[Math.floor(rand() * postTypes.length)]
    const caption = sampleCaptions[Math.floor(rand() * sampleCaptions.length)]
    const thumb = sampleThumbnails[Math.floor(rand() * sampleThumbnails.length)]

    const postDate = new Date(now)
    postDate.setDate(postDate.getDate() - Math.floor(rand() * 55) - 1)

    const likes = Math.floor(baseMultiplier + rand() * 14000)
    const commentsCount = Math.floor((likes * 0.04) + rand() * 250)
    const views = type === 'reel' ? likes * 6 : likes * 2.5
    const reach = Math.floor(views * (1.1 + rand() * 0.4))
    const engagementRate = Number(((likes + commentsCount) / (reach || 1000) * 100).toFixed(2))

    posts.push({
      id: `post_${accountId}_${i + 1}`,
      accountId,
      igMediaId: `media_${accountId}_${1000 + i}`,
      type,
      caption,
      postedAt: postDate.toISOString(),
      permalink: `https://instagram.com/p/sample_${accountId}_${i}`,
      thumbnailUrl: thumb,
      imageUrl: thumb,
      metrics: {
        likes,
        commentsCount,
        views,
        reach,
        engagementRate
      }
    })
  }

  return posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

export type PostSortOption = 'date' | 'engagement' | 'likes'
export type PostTypeFilter = 'all' | 'reel' | 'image' | 'carousel'

export interface AccountOverview {
  accountId: string
  range: string
  followerGrowth: {
    start: number
    end: number
    absoluteChange: number
    percentChange: number
  }
  averageEngagementRate: number
  postFrequency: {
    totalPosts: number
    postsPerWeek: number
  }
}

export interface PaginatedPosts {
  data: PostItem[]
  meta: { nextCursor: string | null; limit: number }
}

export function generateMockOverview(accountId: string | number, range: string): AccountOverview {
  const rand = seededRandom(`${accountId}-overview-${range}`)
  const end = Math.round(8000 + rand() * 180000)
  const start = Math.round(end * (0.92 + rand() * 0.05))
  const absoluteChange = end - start
  const percentChange = start > 0 ? Number(((absoluteChange / start) * 100).toFixed(2)) : 0
  const totalPosts = Math.floor(6 + rand() * 20)

  return {
    accountId: String(accountId),
    range,
    followerGrowth: { start, end, absoluteChange, percentChange },
    averageEngagementRate: Number((2 + rand() * 8).toFixed(2)),
    postFrequency: {
      totalPosts,
      postsPerWeek: Number((totalPosts / 4).toFixed(1))
    }
  }
}

// ============ DUYGU ANALİZİ (F3.1) MOCK VERİ TİPLERİ VE ÜRETİCİSİ ============

export interface SentimentPostItem {
  postId: string
  caption: string
  positive: { count: number; percentage: number }
  neutral: { count: number; percentage: number }
  negative: { count: number; percentage: number }
  totalAnalyzedComments: number
}

export interface SentimentData {
  distribution: {
    positive: number
    neutral: number
    negative: number
  }
  totalAnalyzedComments: number
  posts: SentimentPostItem[]
}

export function generateMockSentiment(accountId: string | number): SentimentData {
  const samplePosts: SentimentPostItem[] = [
    {
      postId: `post_${accountId}_1`,
      caption: 'Yaz kampanyası lansmanı 🚀',
      positive: { count: 16, percentage: 67 },
      neutral: { count: 6, percentage: 25 },
      negative: { count: 2, percentage: 8 },
      totalAnalyzedComments: 24
    },
    {
      postId: `post_${accountId}_2`,
      caption: 'Perde arkası — atölye günlüğü 🎥',
      positive: { count: 5, percentage: 42 },
      neutral: { count: 5, percentage: 42 },
      negative: { count: 2, percentage: 16 },
      totalAnalyzedComments: 12
    },
    {
      postId: `post_${accountId}_3`,
      caption: 'Yeni koleksiyon tanıtımı ✨',
      positive: { count: 3, percentage: 33 },
      neutral: { count: 3, percentage: 33 },
      negative: { count: 3, percentage: 34 },
      totalAnalyzedComments: 9
    },
    {
      postId: `post_${accountId}_4`,
      caption: 'Hafta sonu kahve sohbeti ☕️',
      positive: { count: 18, percentage: 75 },
      neutral: { count: 4, percentage: 17 },
      negative: { count: 2, percentage: 8 },
      totalAnalyzedComments: 24
    },
    {
      postId: `post_${accountId}_5`,
      caption: 'Kullanıcı geri bildirimleri & SSS 💬',
      positive: { count: 8, percentage: 40 },
      neutral: { count: 8, percentage: 40 },
      negative: { count: 4, percentage: 20 },
      totalAnalyzedComments: 20
    }
  ]

  const totalAnalyzed = samplePosts.reduce((acc, p) => acc + p.totalAnalyzedComments, 0)
  const totalPos = samplePosts.reduce((acc, p) => acc + p.positive.count, 0)
  const totalNeu = samplePosts.reduce((acc, p) => acc + p.neutral.count, 0)
  const totalNeg = samplePosts.reduce((acc, p) => acc + p.negative.count, 0)

  return {
    distribution: {
      positive: Math.round((totalPos / (totalAnalyzed || 1)) * 100),
      neutral: Math.round((totalNeu / (totalAnalyzed || 1)) * 100),
      negative: Math.round((totalNeg / (totalAnalyzed || 1)) * 100)
    },
    totalAnalyzedComments: totalAnalyzed,
    posts: samplePosts
  }
}

// ============ KONU ANALİZİ (F3.2 - BERTopic) MOCK VERİSİ ============

export const mockTopicData = {
  status: 'completed',
  total_topics: 3,
  topics: [
    {
      topicId: 't1',
      topicName: 'Fiyat / Performans',
      count: 42,
      keywords: ['fiyat', 'performans', 'kalite', 'ücret', 'uygun'],
      sampleComments: [
        {
          id: 'c1',
          text: 'Fiyatına göre sunduğu performans gerçekten harika, kesinlikle tavsiye ederim.',
          sentiment: 'positive',
          commentedAt: '2026-08-07T10:00:00Z'
        },
        {
          id: 'c2',
          text: 'Son zamlardan sonra F/P özelliğini biraz kaybetti ama yine de idare eder.',
          sentiment: 'neutral',
          commentedAt: '2026-08-06T14:30:00Z'
        }
      ]
    },
    {
      topicId: 't2',
      topicName: 'Müşteri Hizmetleri & Destek',
      count: 28,
      keywords: ['destek', 'iade', 'gecikme', 'kargo', 'iletişim'],
      sampleComments: [
        {
          id: 'c3',
          text: 'İade sürecinde mesajlarıma 3 gün boyunca kimse cevap vermedi, çok kötü deneyim.',
          sentiment: 'negative',
          commentedAt: '2026-08-05T09:15:00Z'
        }
      ]
    },
    {
      topicId: 't3',
      topicName: 'Tasarım & Kullanılabilirlik',
      count: 19,
      keywords: ['tasarım', 'arayüz', 'şık', 'kolay', 'renk'],
      sampleComments: [
        {
          id: 'c4',
          text: 'Arayüz tasarımı çok şık ve minimal olmuş, kullanırken hiç zorlanmadım.',
          sentiment: 'positive',
          commentedAt: '2026-08-04T16:00:00Z'
        }
      ]
    }
  ]
}

// ============ HASHTAG ANALİZİ (F8) ============

export interface HashtagStat {
  tag: string
  usageCount: number
  avgEngagement: number
}

// ============ EN İYİ PAYLAŞIM ZAMANI (F7) — ISI HARİTASI ============

export interface BestTimeSlot {
  hour: number
  dayOfWeek: number
  sampleSize: number
  avgEngagement: number | null
}

export function generateBestTimes(accountId: string | number): BestTimeSlot[] {
  const rand = seededRandom(`${accountId}-best-times`)
  const slots: BestTimeSlot[] = []

  for (let day = 1; day <= 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isPeakDay = day === 4
      const isEveningWindow = hour >= 18 && hour <= 21

      let base = 1 + rand() * 3
      if (isPeakDay && isEveningWindow) base += 5 + rand() * 3
      else if (isEveningWindow) base += 2 + rand() * 2

      const sampleSize = base > 4 ? Math.floor(rand() * 4) + 2 : Math.floor(rand() * 2)

      slots.push({
        hour,
        dayOfWeek: day,
        sampleSize,
        avgEngagement: sampleSize > 0 ? Number(base.toFixed(2)) : null
      })
    }
  }

  return slots
}