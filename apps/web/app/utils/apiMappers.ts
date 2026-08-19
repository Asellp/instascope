// apps/web/app/utils/apiMappers.ts

import type {
  Account, TimeSeriesPoint, ContentMixSlice, ContentTypePerformance,
  PostItem, AccountOverview
} from '~/utils/mockData'

// ============ SENTIMENT (F3.1) ============

export interface SentimentBreakdownPart {
  count: number
  percentage: number
}

export interface PostSentimentBreakdown {
  postId: string
  igMediaId: string
  caption: string
  totalAnalyzedComments: number
  positive: SentimentBreakdownPart
  neutral: SentimentBreakdownPart
  negative: SentimentBreakdownPart
}

export interface SentimentData {
  distribution: { positive: number; neutral: number; negative: number }
  totalAnalyzedComments: number
  posts: PostSentimentBreakdown[]
}

// ============ SENTIMENT REASONS (DUYGU NEDENLERİ) ============

export interface SentimentReasonKeyword {
  word: string
  count: number
}

export interface SentimentReason {
  postId: string
  caption: string
  dominantLabel: 'positive' | 'negative' | 'neutral'
  commentCount: number
  keywords: SentimentReasonKeyword[]
}

export function mapSentimentReasons(raw: any[]): SentimentReason[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r: any) => ({
    postId: String(r.postId ?? ''),
    caption: String(r.caption ?? ''),
    dominantLabel: (r.dominantLabel ?? 'neutral') as 'positive' | 'negative' | 'neutral',
    commentCount: Number(r.commentCount ?? 0),
    keywords: (Array.isArray(r.keywords) ? r.keywords : []).map((k: any) => ({
      word: String(k.word ?? ''),
      count: Number(k.count ?? 0)
    }))
  }))
}

// ============ KONU ANALİZİ (F3.2 - BERTopic) ============

export interface TopicComment {
  id: string
  text: string
  sentiment: 'positive' | 'negative' | 'neutral'
  commentedAt: string
}

export interface Topic {
  topicId: string
  topicName: string
  count: number
  keywords: string[]
  sampleComments: TopicComment[]
}

export interface TopicsData {
  status: string
  total_topics: number
  topics: Topic[]
}

export const AVATAR_STYLES = [
  { avatarBg: 'bg-orange-red', borderClass: 'border-grad-orange' },
  { avatarBg: 'bg-pink-purple', borderClass: 'border-grad-purple' },
  { avatarBg: 'bg-teal-cyan', borderClass: 'border-grad-cyan' },
  { avatarBg: 'bg-purple-blue', borderClass: 'border-grad-pink' },
  { avatarBg: 'bg-green-teal', borderClass: 'border-grad-green' }
]

export const SOURCE_LABEL: Record<string, 'API' | 'Scrape' | 'Mock'> = {
  api: 'API',
  scrape: 'Scrape',
  mock: 'Mock',
  ai: 'API'
}

export const FREQ_INTERVAL: Record<string, string> = {
  hourly: '1 saatte bir',
  daily: '24 saatte bir',
  weekly: '7 günde bir'
}

const STATUS_LABEL: Record<string, Account['status']> = {
  collecting: 'Toplanıyor',
  pending: 'Toplanıyor',
  active: 'Aktif',
  completed: 'Aktif',
  error: 'Hata',
  failed: 'Hata'
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function mapCronToInterval(cron: string | null | undefined): string {
  if (!cron) return 'Bilinmiyor'
  const knownPatterns: Record<string, string> = {
    '0 * * * *': 'Saatte bir',
    '0 0 * * *': '24 saatte bir',
    '0 0 */6 * *': '6 saatte bir',
    '0 0 * * 0': '7 günde bir'
  }
  return knownPatterns[cron] ?? cron
}

export function mapAccount(raw: any, overview?: AccountOverview, styleIndex = 0): Account {
  const username = String(raw.igUsername ?? raw.username ?? '').replace('@', '')
  const style = AVATAR_STYLES[styleIndex % AVATAR_STYLES.length]
  const rawStatus = String(raw.status ?? '').toLowerCase()
  const sourceTypeRaw = String(raw.sourceType ?? 'api').toLowerCase()

  const followers = overview?.followerGrowth?.end
  const er = overview?.averageEngagementRate

  return {
    id: raw.id,
    igUsername: username,
    sourceType: sourceTypeRaw,
    name: username,
    handle: `@${username}`,
    slug: username.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    avatar: username.slice(0, 2).toUpperCase() || 'IG',
    ...style,
    source: SOURCE_LABEL[sourceTypeRaw] ?? 'API',
    status: STATUS_LABEL[rawStatus] ?? 'Toplanıyor',
    interval: mapCronToInterval(raw.scheduleCron),
    followers: followers !== undefined && followers > 0 ? formatCompactNumber(followers) : '—',
    er: er !== undefined && er > 0 ? `${er.toFixed(2)}%` : '—',
    erClass: 'text-pink'
  }
}

export function mapOverview(raw: any): AccountOverview {
  return {
    accountId: raw.accountId,
    range: raw.range,
    followerGrowth: {
      start: Number(raw.followerGrowth?.start ?? 0),
      end: Number(raw.followerGrowth?.end ?? 0),
      absoluteChange: Number(raw.followerGrowth?.absoluteChange ?? 0),
      percentChange: Number(raw.followerGrowth?.percentChange ?? 0)
    },
    averageEngagementRate: Number(raw.averageEngagementRate ?? 0),
    postFrequency: {
      totalPosts: Number(raw.postFrequency?.totalPosts ?? 0),
      postsPerWeek: Number(raw.postFrequency?.postsPerWeek ?? 0)
    }
  }
}

export function mockSentimentData(): SentimentData {
  const posts: PostSentimentBreakdown[] = [
    {
      postId: 'mock_1',
      igMediaId: 'mock_media_1',
      caption: 'Yaz kampanyası lansmanı 🚀',
      totalAnalyzedComments: 24,
      positive: { count: 16, percentage: 66.7 },
      neutral: { count: 6, percentage: 25 },
      negative: { count: 2, percentage: 8.3 }
    },
    {
      postId: 'mock_2',
      igMediaId: 'mock_media_2',
      caption: 'Perde arkası — atölye günlüğü',
      totalAnalyzedComments: 12,
      positive: { count: 5, percentage: 41.7 },
      neutral: { count: 5, percentage: 41.7 },
      negative: { count: 2, percentage: 16.6 }
    },
    {
      postId: 'mock_3',
      igMediaId: 'mock_media_3',
      caption: 'Yeni koleksiyon tanıtımı',
      totalAnalyzedComments: 9,
      positive: { count: 3, percentage: 33.3 },
      neutral: { count: 3, percentage: 33.3 },
      negative: { count: 3, percentage: 33.3 }
    }
  ]

  const totalAnalyzedComments = posts.reduce((sum, p) => sum + p.totalAnalyzedComments, 0)
  const posSum = posts.reduce((sum, p) => sum + p.positive.count, 0)
  const neuSum = posts.reduce((sum, p) => sum + p.neutral.count, 0)
  const negSum = posts.reduce((sum, p) => sum + p.negative.count, 0)

  return {
    distribution: {
      positive: Math.round((posSum / totalAnalyzedComments) * 100),
      neutral: Math.round((neuSum / totalAnalyzedComments) * 100),
      negative: Math.round((negSum / totalAnalyzedComments) * 100)
    },
    totalAnalyzedComments,
    posts
  }
}

export function mapSentimentResponse(raw: any): SentimentData {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      distribution: { positive: 0, neutral: 0, negative: 0 },
      totalAnalyzedComments: 0,
      posts: []
    }
  }

  const posts: PostSentimentBreakdown[] = raw.map((item: any) => ({
    postId: String(item.postId ?? ''),
    igMediaId: String(item.igMediaId ?? ''),
    caption: item.caption && String(item.caption).trim() ? String(item.caption) : '(Başlıksız gönderi)',
    totalAnalyzedComments: Number(item.totalAnalyzedComments ?? 0),
    positive: {
      count: Number(item.breakdown?.positive?.count ?? 0),
      percentage: Number(item.breakdown?.positive?.percentage ?? 0)
    },
    neutral: {
      count: Number(item.breakdown?.neutral?.count ?? 0),
      percentage: Number(item.breakdown?.neutral?.percentage ?? 0)
    },
    negative: {
      count: Number(item.breakdown?.negative?.count ?? 0),
      percentage: Number(item.breakdown?.negative?.percentage ?? 0)
    }
  }))

  const totalAnalyzedComments = posts.reduce((sum, p) => sum + p.totalAnalyzedComments, 0)
  const posSum = posts.reduce((sum, p) => sum + p.positive.count, 0)
  const neuSum = posts.reduce((sum, p) => sum + p.neutral.count, 0)
  const negSum = posts.reduce((sum, p) => sum + p.negative.count, 0)

  return {
    distribution: totalAnalyzedComments > 0
      ? {
          positive: Math.round((posSum / totalAnalyzedComments) * 100),
          neutral: Math.round((neuSum / totalAnalyzedComments) * 100),
          negative: Math.round((negSum / totalAnalyzedComments) * 100)
        }
      : { positive: 0, neutral: 0, negative: 0 },
    totalAnalyzedComments,
    posts
  }
}

export function dominantSentiment(p: PostSentimentBreakdown): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  if (p.positive.count > p.neutral.count && p.positive.count > p.negative.count) return 'POSITIVE'
  if (p.negative.count > p.neutral.count && p.negative.count > p.positive.count) return 'NEGATIVE'
  return 'NEUTRAL'
}

// ============ MOCK VE MAPPER DÖNÜŞTÜRÜCÜLERİ (F3.2) ============

export function mockTopicsData(): TopicsData {
  return {
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
}

function extractKeywordText(kw: any): string {
  if (typeof kw === 'string') return kw
  if (kw && typeof kw === 'object') {
    return String(kw.word ?? kw.name ?? kw.text ?? kw.keyword ?? '')
  }
  return String(kw ?? '')
}

function generateTopicTitle(keywords: string[], fallbackIdx: number): string {
  if (!keywords || keywords.length === 0) return `Tema #${fallbackIdx + 1}`
  const topWords = keywords.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1))
  return topWords.join(' & ')
}

export function mapTopicsResponse(raw: any): TopicsData {
  if (!raw) return mockTopicsData()

  const topicsArray = Array.isArray(raw) ? raw : (raw.topics || [])

  return {
    status: raw.status || 'completed',
    total_topics: raw.total_topics ?? topicsArray.length,
    topics: topicsArray.map((t: any, idx: number) => {
      const rawKeywords = Array.isArray(t.keywords) ? t.keywords : []
      const cleanKeywords = rawKeywords
        .map(extractKeywordText)
        .filter(k => k.length > 0)

      const rawName = String(t.topic_name ?? t.topicName ?? t.name ?? t.title ?? '').trim()
      const finalTopicName = (rawName && rawName !== 'Genel Konu')
        ? rawName
        : generateTopicTitle(cleanKeywords, idx)

      return {
        topicId: String(t.topic_id ?? t.topicId ?? t.id ?? `t_${idx}`),
        topicName: finalTopicName,
        count: Number(t.document_count ?? t.count ?? t.sampleComments?.length ?? 0),
        keywords: cleanKeywords,
        sampleComments: (Array.isArray(t.sampleComments) ? t.sampleComments : []).map((c: any, cIdx: number) => ({
          id: String(c.id || `c_${cIdx}`),
          text: String(c.text || c.comment || ''),
          sentiment: (c.sentiment || 'neutral') as 'positive' | 'negative' | 'neutral',
          commentedAt: String(c.commentedAt || c.created_at || new Date().toISOString())
        }))
      }
    })
  }
}

export function mapAccountMetricsToSeries(
  raw: any[],
  metric: 'followers' | 'following' | 'mediaCount',
  range: number
): TimeSeriesPoint[] {
  if (!Array.isArray(raw) || raw.length === 0) return []

  const cutoff = Date.now() - range * 24 * 60 * 60 * 1000
  return raw
    .map((r: any) => ({
      date: String(r.capturedAt ?? r.captured_at ?? r.createdAt ?? r.date ?? ''),
      value: Number(r[metric] ?? 0)
    }))
    .filter(p => p.date && new Date(p.date).getTime() >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function deriveEngagementTimeseries(posts: PostItem[], range: number): TimeSeriesPoint[] {
  const byDate = new Map<string, number[]>()
  posts.forEach(p => {
    const date = p.postedAt.slice(0, 10)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(p.metrics.engagementRate)
  })
  const points: TimeSeriesPoint[] = Array.from(byDate.entries())
    .map(([date, values]) => ({
      date,
      value: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return points.slice(-range)
}

function normalizePostType(value: unknown): PostItem['type'] {
  const v = String(value ?? '').toLowerCase()
  if (v.includes('reel') || v.includes('video')) return 'reel'
  if (v.includes('carousel')) return 'carousel'
  return 'image'
}

export function mapPost(raw: any, accountId: string | number): PostItem {
  const m = raw.postMetrics ?? raw.metrics ?? raw
  const likes = Number(m.likes ?? 0)
  const commentsCount = Number(m.commentsCount ?? m.comments_count ?? 0)
  const views = Number(m.views ?? 0)
  const reach = Number(m.reach ?? 0)
  const engagementRate = Number(
    m.engagementRate ?? (reach ? ((likes + commentsCount) / reach) * 100 : 0)
  )

  return {
    id: String(raw.id ?? `${accountId}-${Math.random().toString(36).slice(2)}`),
    accountId,
    igMediaId: raw.igMediaId ?? '',
    type: normalizePostType(raw.type ?? raw.contentType),
    caption: raw.caption ?? '',
    postedAt: raw.postedAt ?? new Date().toISOString(),
    permalink: raw.permalink ?? '#',
    thumbnailUrl: raw.imageUrl ?? raw.thumbnailUrl ?? raw.mediaUrl ?? '',
    metrics: { likes, commentsCount, views, reach, engagementRate: Number(engagementRate.toFixed(2)) }
  }
}

const TYPE_LABEL: Record<PostItem['type'], string> = { reel: 'Reel', image: 'Foto', carousel: 'Carousel' }
const TYPE_COLOR: Record<PostItem['type'], string> = { reel: '#ec4899', image: '#a855f7', carousel: '#06b6d4' }

const ALL_POST_TYPES: PostItem['type'][] = ['reel', 'image', 'carousel']

export function deriveContentMix(posts: PostItem[]): ContentMixSlice[] {
  if (!posts.length) return []
  const counts: Record<PostItem['type'], number> = { reel: 0, image: 0, carousel: 0 }
  posts.forEach(p => { counts[p.type] = (counts[p.type] ?? 0) + 1 })
  return ALL_POST_TYPES.map(type => ({
    label: TYPE_LABEL[type],
    value: Math.round((counts[type] / posts.length) * 100),
    color: TYPE_COLOR[type]
  }))
}

export function deriveContentPerformance(posts: PostItem[]): ContentTypePerformance[] {
  const groups: Record<PostItem['type'], number[]> = { reel: [], image: [], carousel: [] }
  posts.forEach(p => { groups[p.type].push(p.metrics.engagementRate) })
  return ALL_POST_TYPES.map(type => {
    const arr = groups[type]
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    return { label: TYPE_LABEL[type], avgEngagement: Number(avg.toFixed(2)) }
  })
}

// ============ ETKİLEŞİM TAHMİN MODELİ (Likes Baseline) ============

export interface LikesBaselineData {
  mae: number
  naiveMae: number
  modelType: string
  beatsNaive: boolean
  sampleSize: number
  createdAt: string
}

export function mapLikesBaselineResponse(raw: any): LikesBaselineData {
  return {
    mae: Number(raw.mae ?? 0),
    naiveMae: Number(raw.naiveMae ?? 0),
    modelType: String(raw.modelType ?? 'bilinmiyor'),
    beatsNaive: Boolean(raw.beatsNaive),
    sampleSize: Number(raw.sampleSize ?? 0),
    createdAt: String(raw.createdAt ?? '')
  }
}

// ============ SPAM / BOT TESPİTİ ============

export interface FlaggedComment {
  commentId: string
  text: string
  confidence: number
}

export interface SpamData {
  totalComments: number
  totalFlagged: number
  flaggedPercentage: number
  flaggedComments: FlaggedComment[]
}

export function mapSpamResponse(raw: any): SpamData {
  return {
    totalComments: Number(raw.totalCommentsAnalyzed ?? 0),
    totalFlagged: Number(raw.spamCount ?? 0),
    flaggedPercentage: Number(raw.spamRate ?? 0),
    flaggedComments: (raw.flaggedComments ?? []).map((c: any) => ({
      commentId: String(c.commentId ?? ''),
      text: String(c.text ?? ''),
      confidence: Number(c.confidence ?? 0)
    }))
  }
}

export function riskLevel(confidence: number): 'high' | 'medium' {
  return confidence >= 0.75 ? 'high' : 'medium'
}