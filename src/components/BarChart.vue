<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { useTheme } from 'vuetify'
import type { ChartData, ChartOptions } from 'chart.js'

const props = withDefaults(
  defineProps<{
    data: ChartData<'bar'>
    height?: number
    horizontal?: boolean
    percentAxis?: boolean
  }>(),
  { height: 320, horizontal: false, percentAxis: false },
)

const theme = useTheme()

const options = computed<ChartOptions<'bar'>>(() => {
  const dark = theme.current.value.dark
  const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const text = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'

  const pct = (v: string | number) => `${v}%`
  const xTicks: Record<string, unknown> = { color: text }
  const yTicks: Record<string, unknown> = { color: text }
  if (props.percentAxis && props.horizontal) xTicks.callback = pct
  if (props.percentAxis && !props.horizontal) yTicks.callback = pct

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: props.horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: props.percentAxis
          ? { label: (c) => ` ${c.dataset.label ?? ''}: ${Number(c.parsed.x ?? c.parsed.y).toFixed(1)}%` }
          : undefined,
      },
    },
    scales: {
      x: {
        grid: { color: props.horizontal ? grid : 'transparent' },
        ticks: xTicks,
        border: { display: false },
      },
      y: {
        grid: { color: props.horizontal ? 'transparent' : grid },
        ticks: yTicks,
        border: { display: false },
      },
    },
  }
})
</script>

<template>
  <div :style="{ position: 'relative', height: `${props.height}px` }">
    <Bar :data="props.data" :options="options" />
  </div>
</template>
