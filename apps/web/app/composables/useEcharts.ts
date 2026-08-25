import { onMounted, onBeforeUnmount, watch, nextTick, type Ref } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { LegacyGridContainLabel } from 'echarts/features'


echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
  LegacyGridContainLabel
])

export function useEcharts(
  containerRef: Ref<HTMLElement | null>,
  optionRef: Ref<EChartsOption | null>
) {
  let chart: echarts.ECharts | null = null
  let resizeObserver: ResizeObserver | null = null

  function handleResize() {
    if (!containerRef.value || !chart) return
    chart.resize()
  }

  function setupResizeObserver() {
    if (!containerRef.value || resizeObserver) return
    resizeObserver = new ResizeObserver(() => {
      if (!containerRef.value) return
      if (containerRef.value.clientWidth > 0 && containerRef.value.clientHeight > 0) {
        handleResize()
      }
    })
    resizeObserver.observe(containerRef.value)
  }

  async function render() {
    await nextTick()
    if (!containerRef.value || !optionRef.value) return
    if (containerRef.value.clientWidth === 0 || containerRef.value.clientHeight === 0) return

    if (!chart) {
      chart = echarts.init(containerRef.value)
      window.addEventListener('resize', handleResize)
      setupResizeObserver()
    }

    chart.setOption(optionRef.value, true)
    handleResize()
  }

  onMounted(() => {
    render()
  })

  watch(optionRef, () => {
    render()
  }, { deep: true, flush: 'post' })

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    window.removeEventListener('resize', handleResize)
    chart?.dispose()
    chart = null
  })

  return { resize: handleResize }
}