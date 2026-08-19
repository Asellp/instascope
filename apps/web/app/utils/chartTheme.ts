export function cssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function chartPalette() {
  return {
    brand: cssVar('--brand', '#ec4899'),
    brand2: cssVar('--brand-2', '#f97316'),
    violet: cssVar('--violet', '#a855f7'),
    cyan: cssVar('--cyan', '#06b6d4'),
    muted: cssVar('--muted-foreground', '#94a3b8'),
    border: cssVar('--border', 'rgba(255,255,255,0.08)'),
    foreground: cssVar('--foreground', '#f8fafc')
  }
}

/**
 * main.css'teki .custom-tooltip stiliyle görsel olarak birebir eşleşen
 * ortak ECharts tooltip teması.
 */
export function tooltipTheme() {
  const palette = chartPalette()
  return {
    backgroundColor: '#0f111a',
    borderColor: palette.border,
    borderWidth: 1,
    textStyle: { color: '#fff', fontSize: 12, fontWeight: 600 },
    padding: [8, 12] as [number, number],
    extraCssText: 'border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.4);'
  }
}

/**
 * Hex rengi belirli bir alpha (0-255 arası, hex string) ile birleştirir.
 * Örn: hexWithAlpha('#ec4899', '59') => '#ec489959' (~%35 opaklık)
 */
export function hexWithAlpha(hex: string, alphaHex: string) {
  if (!hex.startsWith('#')) return hex
  return `${hex}${alphaHex}`
}


/**
 * Eğer bir renk değeri 'var(--x)' formatındaysa, gerçek çözümlenmiş rengi
 * (getComputedStyle üzerinden) döndürür. Canvas API'si CSS custom property'leri
 * anlamadığı için (özellikle addColorStop gibi manuel gradient çağrılarında),
 * chart bileşenlerine renk geçerken bu fonksiyonla "güvenli hale" getirilmeli.
 */
export function resolveColor(color?: string): string {
  if (!color) return ''
  const match = color.match(/^var\((--[\w-]+)\)$/)
  if (match) {
    return cssVar(match[1], '#ec4899')
  }
  return color
}