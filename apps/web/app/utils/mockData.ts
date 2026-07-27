// apps/web/app/utils/mockData.ts

export interface CreateAccountDto {
  igUsername: string
  sourceType: string
  accessTokenEnc?: string
}

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