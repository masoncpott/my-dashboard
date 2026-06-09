<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { useTheme } from 'vuetify'
import type { ChartData, ChartOptions } from 'chart.js'

const props = withDefaults(
  defineProps<{
    data: ChartData<'line'>
    height?: number
    percentAxis?: boolean
    suggestedMin?: number
    suggestedMax?: number
  }>(),
  { height: 320, percentAxis: false },
)

const theme = useTheme()

const options = computed<ChartOptions<'line'>>(() => {
  const dark = theme.current.value.dark
  const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const text = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: props.percentAxis
          ? { label: (c) => ` ${c.dataset.label ?? ''}: ${Number(c.parsed.y).toFixed(1)}%` }
          : undefined,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        suggestedMin: props.suggestedMin,
        suggestedMax: props.suggestedMax,
        grid: { color: grid },
        ticks: { color: text, callback: props.percentAxis ? (v) => `${v}%` : undefined },
        border: { display: false },
      },
    },
  }
})
</script>

<template>
  <div :style="{ position: 'relative', height: `${props.height}px` }">
    <Line :data="props.data" :options="options" />
  </div>
</template>
