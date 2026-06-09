<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import BarChart from './BarChart.vue'
import type { Summary } from '../data/logistics'

const props = defineProps<{
  regions: Summary['regions']
}>()

const theme = useTheme()
const palette = computed(() => theme.current.value.colors as Record<string, string>)

const chartData = computed(() => ({
  labels: props.regions.map((r) => r.name),
  datasets: [
    {
      label: 'Shipments',
      data: props.regions.map((r) => r.shipments),
      backgroundColor: [
        palette.value.primary,
        palette.value.secondary,
        palette.value.info,
        palette.value.accent,
        palette.value.warning,
      ],
      borderRadius: 6,
    },
  ],
}))

function barColor(rate: number): string {
  return rate >= 0.93 ? 'success' : rate >= 0.9 ? 'warning' : 'error'
}
</script>

<template>
  <BarChart :data="chartData" :height="170" horizontal />
  <div class="mt-4">
    <div
      v-for="r in regions"
      :key="r.name"
      class="d-flex align-center mb-2 ga-3"
    >
      <div class="text-body-2 text-medium-emphasis" style="width: 90px">{{ r.name }}</div>
      <v-progress-linear
        :model-value="r.onTimeRate * 100"
        :color="barColor(r.onTimeRate)"
        height="8"
        rounded
        class="flex-grow-1"
      />
      <div class="text-body-2 font-weight-medium" style="width: 52px; text-align: right">
        {{ (r.onTimeRate * 100).toFixed(1) }}%
      </div>
    </div>
  </div>
</template>
