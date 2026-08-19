<template>
  <div class="chart-wrap" :style="{ height }">
    <div ref="containerRef" class="chart-fill"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEcharts } from '~/composables/useEcharts'
import { chartPalette, tooltipTheme } from '~/utils/chartTheme'

export interface SentimentTrendPoint {
  date: string
  positive: number
  neutral: number
  negative: number
}

const props = withDefaults(defineProps<{
  data: SentimentTrendPoint[]
  height?: string
}>(), {
  height: '220px'
})

const containerRef = ref<HTMLElement | null>(null)

function formatAxisDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#f59e0b', negative: '#f43f5e' }
const SENTIMENT_LABELS = { positive: 'Pozitif', neutral: 'Nötr', negative: 'Negatif' }

const option = computed(() => {
  if (!props.data?.length) return null
  const palette = chartPalette()
  const dates = props.data.map(d => d.date)

  const makeSeries = (key: 'positive' | 'neutral' | 'negative') => ({
    name: SENTIMENT_LABELS[key],
    type: 'line',
    smooth: true,
    showSymbol: true,
    symbolSize: 6,
    lineStyle: { width: 2.5, color: SENTIMENT_COLORS[key] },
    itemStyle: { color: SENTIMENT_COLORS[key] },
    data: props.data.map(d => d[key])
  })

  return {
    grid: { 
      left: '3%', 
      right: '5%', 
      top: '18%', 
      bottom: '6%',
      containLabel: true 
    },
    legend: {
      top: 0,
      right: 10,
      textStyle: { color: palette.muted, fontSize: 11, fontWeight: 600 },
      itemWidth: 10,
      itemHeight: 10
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: palette.border } },
      axisLabel: { color: palette.muted, fontSize: 10, formatter: (v: string) => formatAxisDate(v) }
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: palette.border, type: 'dashed' } },
      axisLabel: { color: palette.muted, fontSize: 10, formatter: '%{value}' }
    },
    tooltip: {
      trigger: 'axis',
      ...tooltipTheme(),
      formatter: (params: any) => {
        const dateLabel = formatAxisDate(params[0]?.axisValue ?? '')
        const lines = params.map((p: any) => `${p.marker} ${p.seriesName}: <strong>%${p.value}</strong>`).join('<br/>')
        return `${dateLabel}<br/>${lines}`
      }
    },
    series: [makeSeries('positive'), makeSeries('neutral'), makeSeries('negative')]
  }
})

useEcharts(containerRef, option)
</script>

<style scoped>
.chart-wrap { width: 100%; position: relative; }
.chart-fill { width: 100%; height: 100%; }
</style>