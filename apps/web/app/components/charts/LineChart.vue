<template>
  <div class="chart-wrap" :style="{ height }">
    <div v-if="loading" class="skeleton-box chart-fill"></div>
    <div v-else-if="!data || data.length === 0" class="chart-empty">
      <span>Veri bulunamadı</span>
    </div>
    <div v-else ref="containerRef" class="chart-fill"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEcharts } from '~/composables/useEcharts'
import { chartPalette, tooltipTheme, hexWithAlpha, resolveColor } from '~/utils/chartTheme'
import type { TimeSeriesPoint } from '~/utils/mockData'

const props = withDefaults(defineProps<{
  data: TimeSeriesPoint[]
  color?: string
  loading?: boolean
  height?: string
  showAxis?: boolean
  valueFormatter?: (value: number) => string
}>(), {
  loading: false,
  height: '220px',
  showAxis: false
})

const containerRef = ref<HTMLElement | null>(null)

/**
 * DÜZELTME: Backend aynı gün içinde dakikalar arayla birden fazla
 * snapshot dönebildiğinde (örn: 12:06, 12:34), tüm seri 48 saatten
 * darsa Saat:Dakika formatı kullanılır. Normal 7g/30g/90g aralıklarında
 * ise Türkçe kısa tarih ("14 Ağu") gösterilir.
 */
const dateRangeSpanHours = computed(() => {
  if (!props.data || props.data.length < 2) return 0
  const times = props.data
    .map(d => new Date(d.date).getTime())
    .filter(t => !Number.isNaN(t))
  if (times.length < 2) return 0
  return (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60)
})

function formatAxisDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  if (dateRangeSpanHours.value > 0 && dateRangeSpanHours.value < 48) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

const option = computed(() => {
  if (!props.data?.length) return null
  const palette = chartPalette()
  const lineColor = resolveColor(props.color) || palette.brand
  return {
    grid: { left: props.showAxis ? 40 : 4, right: 8, top: 16, bottom: props.showAxis ? 24 : 4 },
    xAxis: {
      type: 'category',
      show: props.showAxis,
      data: props.data.map(d => d.date),
      axisLine: { lineStyle: { color: palette.border } },
      axisLabel: {
        color: palette.muted,
        fontSize: 10,
        formatter: (value: string) => formatAxisDate(value)
      }
    },
    yAxis: {
      type: 'value',
      show: props.showAxis,
      scale: true, // DÜZELTME: Y ekseni veri aralığına göre dinamik ölçeklenir
      splitLine: { lineStyle: { color: palette.border, type: 'dashed' } },
      axisLabel: { color: palette.muted, fontSize: 10 }
    },
    tooltip: {
      trigger: 'axis',
      ...tooltipTheme(),
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const val = props.valueFormatter ? props.valueFormatter(p.value) : p.value
        const dateLabel = formatAxisDate(p.axisValue ?? p.axisValueLabel)
        return `${dateLabel}<br/><strong>${val}</strong>`
      }
    },
    series: [{
      type: 'line',
      data: props.data.map(d => d.value),
      smooth: true,
      showSymbol: false,
      symbolSize: 6,
      lineStyle: { width: 2.5, color: lineColor },
      itemStyle: { color: lineColor },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: hexWithAlpha(lineColor, '59') },
            { offset: 1, color: hexWithAlpha(lineColor, '00') }
          ]
        }
      }
    }]
  }
})

useEcharts(containerRef, option)
</script>

<style scoped>
.chart-wrap { width: 100%; position: relative; }
.chart-fill { width: 100%; height: 100%; }
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted-foreground);
  font-size: 0.82rem;
  background: var(--background);
  border-radius: 12px;
}
</style>