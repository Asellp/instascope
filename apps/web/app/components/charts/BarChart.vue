<template>
  <div class="chart-wrap" :style="{ height }">
    <div v-if="loading" class="skeleton-box chart-fill"></div>
    <div v-else-if="!categories || categories.length === 0" class="chart-empty">
      <span>Veri bulunamadı</span>
    </div>
    <div v-else ref="containerRef" class="chart-fill"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEcharts } from '~/composables/useEcharts'
import { chartPalette, tooltipTheme } from '~/utils/chartTheme'

const props = withDefaults(defineProps<{
  categories: string[]
  data: number[]
  colors?: string[]
  loading?: boolean
  height?: string
  valueFormatter?: (value: number) => string
}>(), {
  loading: false,
  height: '220px'
})

const containerRef = ref<HTMLElement | null>(null)

const option = computed(() => {
  if (!props.categories?.length) return null
  const palette = chartPalette()
  const barColors = props.colors || [palette.brand, palette.violet, palette.cyan, palette.brand2]

  return {
    grid: { 
      left: '3%', 
      right: '4%', 
      top: '12%', 
      bottom: '6%',
      containLabel: true 
    },
    xAxis: {
      type: 'category',
      data: props.categories,
      axisLine: { lineStyle: { color: palette.border } },
      axisLabel: { color: palette.muted, fontSize: 11, fontWeight: 600 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: palette.border, type: 'dashed' } },
      axisLabel: { color: palette.muted, fontSize: 10 }
    },
    tooltip: {
      trigger: 'axis',
      ...tooltipTheme(),
      formatter: (params: any) => {
        const p = params[0]
        const val = props.valueFormatter ? props.valueFormatter(p.value) : p.value
        return `${p.name}<br/><strong>${val}</strong>`
      }
    },
    series: [{
      type: 'bar',
      data: props.data.map((val, i) => ({
        value: val,
        itemStyle: { color: barColors[i % barColors.length], borderRadius: [8, 8, 0, 0] }
      })),
      barWidth: '42%'
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