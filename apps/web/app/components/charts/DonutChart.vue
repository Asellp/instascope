<template>
  <div class="donut-wrap" :style="{ height }">
    <div v-if="loading" class="skeleton-box chart-fill" style="border-radius: 50%;"></div>
    <div v-else-if="!slices || slices.length === 0" class="chart-empty">
      <span>Veri bulunamadı</span>
    </div>
    <template v-else>
      <div ref="containerRef" class="chart-fill"></div>
      <div v-if="centerValue" class="donut-center">
        <span class="center-num font-serif-display">{{ centerValue }}</span>
        <span class="center-lbl">{{ centerLabel }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEcharts } from '~/composables/useEcharts'
import { tooltipTheme } from '~/utils/chartTheme'
import type { ContentMixSlice } from '~/utils/mockData'

const props = withDefaults(defineProps<{
  slices: ContentMixSlice[]
  loading?: boolean
  height?: string
  centerValue?: string | number
  centerLabel?: string
}>(), {
  loading: false,
  height: '200px'
})

const containerRef = ref<HTMLElement | null>(null)

const option = computed(() => {
  if (!props.slices?.length) return null

  return {
    tooltip: {
      trigger: 'item',
      ...tooltipTheme(),
      formatter: (params: any) => `${params.name}: <strong>%${params.value}</strong>`
    },
    series: [{
      type: 'pie',
      radius: ['62%', '88%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderColor: 'transparent', borderWidth: 2 },
      emphasis: {
        scaleSize: 6,
        itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.3)' }
      },
      data: props.slices.map(s => ({
        name: s.label,
        value: s.value,
        itemStyle: { color: s.color }
      }))
    }]
  }
})

useEcharts(containerRef, option)
</script>

<style scoped>
.donut-wrap { width: 100%; position: relative; }
.chart-fill { width: 100%; height: 100%; }
.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.center-num { font-size: 1.6rem; display: block; line-height: 1; color: var(--foreground); }
.center-lbl { font-size: 0.65rem; color: var(--muted-foreground); font-weight: 700; }
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted-foreground);
  font-size: 0.82rem;
}
</style>