<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { useTheme } from 'vuetify'
import type { ChartData, ChartOptions } from 'chart.js'

const props = withDefaults(
  defineProps<{
    data: ChartData<'doughnut'>
    height?: number
  }>(),
  { height: 320 },
)

const theme = useTheme()

const options = computed<ChartOptions<'doughnut'>>(() => {
  const dark = theme.current.value.dark
  const text = dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: text, usePointStyle: true, padding: 16, boxWidth: 8 },
      },
    },
  }
})
</script>

<template>
  <div :style="{ position: 'relative', height: `${props.height}px` }">
    <Doughnut :data="props.data" :options="options" />
  </div>
</template>
