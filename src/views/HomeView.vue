<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import BarChart from '../components/BarChart.vue'
import LineChart from '../components/LineChart.vue'
import DoughnutChart from '../components/DoughnutChart.vue'
import {
  MIN_DATE,
  MAX_DATE,
  toISODate,
  parseISODate,
  addDays,
  getRange,
  summarize,
  buildTrend,
} from '../data/logistics'

const theme = useTheme()
const palette = computed(() => theme.current.value.colors as Record<string, string>)

const minISO = toISODate(MIN_DATE)
const maxISO = toISODate(MAX_DATE)

// --- Date range state ------------------------------------------------------

const startInput = ref(toISODate(addDays(MAX_DATE, -89)))
const endInput = ref(maxISO)

// The currently-applied valid range that the charts read from.
const applied = ref({ start: addDays(MAX_DATE, -89), end: MAX_DATE })

interface Validation {
  ok: boolean
  message: string
  start: Date | null
  end: Date | null
}

const validation = computed<Validation>(() => {
  const start = parseISODate(startInput.value)
  const end = parseISODate(endInput.value)

  if (!start || !end) {
    return { ok: false, message: 'Enter both a valid start and end date (YYYY-MM-DD).', start, end }
  }
  if (start < MIN_DATE || end < MIN_DATE) {
    return {
      ok: false,
      message: `Data begins on ${minISO}. Please pick a start date on or after January 1, 2024.`,
      start,
      end,
    }
  }
  if (start > MAX_DATE || end > MAX_DATE) {
    return {
      ok: false,
      message: `Future dates aren't available. Please pick dates on or before today (${maxISO}).`,
      start,
      end,
    }
  }
  if (start > end) {
    return { ok: false, message: 'The start date must be on or before the end date.', start, end }
  }
  return { ok: true, message: '', start, end }
})

watch(
  validation,
  (v) => {
    if (v.ok && v.start && v.end) {
      applied.value = { start: v.start, end: v.end }
    }
  },
  { immediate: true },
)

type PresetKey = '7d' | '30d' | '90d' | 'ytd' | '12m' | 'all'
const presets: { key: PresetKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'ytd', label: 'YTD' },
  { key: '12m', label: '12M' },
  { key: 'all', label: 'All' },
]

function applyPreset(key: PresetKey) {
  let start: Date
  const end = MAX_DATE
  switch (key) {
    case '7d':
      start = addDays(MAX_DATE, -6)
      break
    case '30d':
      start = addDays(MAX_DATE, -29)
      break
    case '90d':
      start = addDays(MAX_DATE, -89)
      break
    case 'ytd':
      start = new Date(MAX_DATE.getFullYear(), 0, 1)
      break
    case '12m':
      start = addDays(MAX_DATE, -364)
      break
    case 'all':
      start = MIN_DATE
      break
  }
  if (start < MIN_DATE) start = MIN_DATE
  startInput.value = toISODate(start)
  endInput.value = toISODate(end)
}

const activePreset = computed<PresetKey | null>(() => {
  if (!validation.value.ok) return null
  const s = startInput.value
  const e = endInput.value
  if (e !== maxISO) return null
  if (s === toISODate(addDays(MAX_DATE, -6))) return '7d'
  if (s === toISODate(addDays(MAX_DATE, -29))) return '30d'
  if (s === toISODate(addDays(MAX_DATE, -89))) return '90d'
  if (s === toISODate(new Date(MAX_DATE.getFullYear(), 0, 1))) return 'ytd'
  if (s === toISODate(addDays(MAX_DATE, -364))) return '12m'
  if (s === minISO) return 'all'
  return null
})

// --- Derived data ----------------------------------------------------------

const records = computed(() => getRange(applied.value.start, applied.value.end))
const summary = computed(() => summarize(records.value))
const trend = computed(() => buildTrend(records.value))

const rangeLabel = computed(() => {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(applied.value.start)} – ${fmt(applied.value.end)}`
})

const nf = new Intl.NumberFormat('en-US')

const kpis = computed(() => [
  {
    title: 'Total Shipments',
    value: nf.format(summary.value.totalShipments),
    icon: 'mdi-package-variant-closed',
    color: 'primary',
  },
  {
    title: 'On-Time Delivery',
    value: `${(summary.value.onTimeRate * 100).toFixed(1)}%`,
    icon: 'mdi-clock-check-outline',
    color: 'success',
  },
  {
    title: 'Open Exceptions',
    value: nf.format(summary.value.openExceptions),
    icon: 'mdi-alert-circle-outline',
    color: 'warning',
  },
  {
    title: 'Top Region',
    value: summary.value.bestRegion.name,
    sub: `${(summary.value.bestRegion.rate * 100).toFixed(1)}% on-time`,
    icon: 'mdi-map-marker-radius-outline',
    color: 'info',
  },
])

// --- Chart datasets (theme-aware) -----------------------------------------

const volumeData = computed(() => ({
  labels: trend.value.labels,
  datasets: [
    {
      label: 'Shipments',
      data: trend.value.shipments,
      borderColor: palette.value.primary,
      backgroundColor: `${palette.value.primary}22`,
      fill: true,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: trend.value.labels.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
    },
  ],
}))

const onTimeData = computed(() => ({
  labels: trend.value.labels,
  datasets: [
    {
      label: 'On-Time Rate',
      data: trend.value.onTimeRate,
      borderColor: palette.value.success,
      backgroundColor: `${palette.value.success}22`,
      fill: true,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: trend.value.labels.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
    },
  ],
}))

const regionColors = computed(() => [
  palette.value.primary,
  palette.value.secondary,
  palette.value.info,
  palette.value.accent,
  palette.value.warning,
])

const regionData = computed(() => ({
  labels: summary.value.regions.map((r) => r.name),
  datasets: [
    {
      label: 'Shipments',
      data: summary.value.regions.map((r) => r.shipments),
      backgroundColor: regionColors.value,
      borderRadius: 6,
    },
  ],
}))

const exceptionData = computed(() => ({
  labels: summary.value.exceptions.map((e) => e.type),
  datasets: [
    {
      data: summary.value.exceptions.map((e) => e.count),
      backgroundColor: [
        palette.value.warning,
        palette.value.info,
        palette.value.secondary,
        palette.value.error,
        palette.value.primary,
      ],
      borderWidth: 0,
    },
  ],
}))

const granularityNote = computed(() => {
  const g = trend.value.granularity
  return g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'
})
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-1 ga-2">
      <div>
        <h1 class="text-h5 font-weight-bold">Operations Overview</h1>
        <div class="text-body-2 text-medium-emphasis">{{ rangeLabel }} · {{ granularityNote }} view</div>
      </div>
    </div>

    <!-- Date range controls -->
    <v-card flat border rounded="lg" class="mb-4">
      <v-card-text class="d-flex flex-wrap align-center ga-4">
        <div class="d-flex flex-wrap ga-1">
          <v-btn
            v-for="p in presets"
            :key="p.key"
            :variant="activePreset === p.key ? 'flat' : 'tonal'"
            :color="activePreset === p.key ? 'primary' : undefined"
            size="small"
            rounded="lg"
            @click="applyPreset(p.key)"
          >
            {{ p.label }}
          </v-btn>
        </div>
        <v-spacer />
        <div class="d-flex flex-wrap align-center ga-3">
          <v-text-field
            v-model="startInput"
            type="date"
            label="Start"
            :min="minISO"
            :max="maxISO"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 170px"
          />
          <v-text-field
            v-model="endInput"
            type="date"
            label="End"
            :min="minISO"
            :max="maxISO"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 170px"
          />
        </div>
      </v-card-text>
      <v-expand-transition>
        <v-alert
          v-if="!validation.ok"
          type="warning"
          variant="tonal"
          density="compact"
          class="mx-4 mb-4"
          :text="validation.message"
        />
      </v-expand-transition>
    </v-card>

    <!-- KPI cards -->
    <v-row>
      <v-col v-for="kpi in kpis" :key="kpi.title" cols="12" sm="6" md="3">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-text class="d-flex align-center">
            <v-avatar :color="kpi.color" size="48" rounded="lg" class="mr-4">
              <v-icon :icon="kpi.icon" color="white" />
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">{{ kpi.title }}</div>
              <div class="text-h6 font-weight-bold">{{ kpi.value }}</div>
              <div v-if="kpi.sub" class="text-caption text-medium-emphasis">{{ kpi.sub }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Volume + exceptions -->
    <v-row class="mt-1">
      <v-col cols="12" md="8">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-title class="text-subtitle-1 font-weight-bold">Shipment Volume</v-card-title>
          <v-card-subtitle>Total packages dispatched over the selected period</v-card-subtitle>
          <v-card-text>
            <LineChart :data="volumeData" :height="320" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-title class="text-subtitle-1 font-weight-bold">Open Exceptions</v-card-title>
          <v-card-subtitle>By exception type</v-card-subtitle>
          <v-card-text>
            <DoughnutChart :data="exceptionData" :height="320" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- On-time + regional -->
    <v-row class="mt-1">
      <v-col cols="12" md="6">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-title class="text-subtitle-1 font-weight-bold">On-Time Delivery Rate</v-card-title>
          <v-card-subtitle>Percent of shipments delivered on schedule</v-card-subtitle>
          <v-card-text>
            <LineChart :data="onTimeData" :height="300" percent-axis :suggested-min="80" :suggested-max="100" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-title class="text-subtitle-1 font-weight-bold">Regional Performance</v-card-title>
          <v-card-subtitle>Shipment volume and reliability by region</v-card-subtitle>
          <v-card-text>
            <BarChart :data="regionData" :height="170" horizontal />
            <div class="mt-4">
              <div
                v-for="r in summary.regions"
                :key="r.name"
                class="d-flex align-center mb-2 ga-3"
              >
                <div class="text-body-2 text-medium-emphasis" style="width: 90px">{{ r.name }}</div>
                <v-progress-linear
                  :model-value="r.onTimeRate * 100"
                  :color="r.onTimeRate >= 0.93 ? 'success' : r.onTimeRate >= 0.9 ? 'warning' : 'error'"
                  height="8"
                  rounded
                  class="flex-grow-1"
                />
                <div class="text-body-2 font-weight-medium" style="width: 52px; text-align: right">
                  {{ (r.onTimeRate * 100).toFixed(1) }}%
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
