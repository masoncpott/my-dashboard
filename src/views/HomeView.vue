<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'
import LineChart from '../components/LineChart.vue'
import DoughnutChart from '../components/DoughnutChart.vue'
import KpiCard from '../components/KpiCard.vue'
import ChartCard from '../components/ChartCard.vue'
import RegionPerformance from '../components/RegionPerformance.vue'
import DashboardFilters, { type AppliedFilters } from '../components/DashboardFilters.vue'
import { MAX_DATE, addDays, getRange, summarize, buildTrend, REGIONS, type Region } from '../data/logistics'

const theme = useTheme()
const palette = computed(() => theme.current.value.colors as Record<string, string>)

// --- Filter state (driven by DashboardFilters) -----------------------------

const filters = ref<AppliedFilters>({
  start: addDays(MAX_DATE, -89),
  end: MAX_DATE,
  region: 'all',
})

const activeRegions = computed<Region[]>(() =>
  filters.value.region === 'all' ? [...REGIONS] : [filters.value.region],
)

// --- Derived data ----------------------------------------------------------

const records = computed(() => getRange(filters.value.start, filters.value.end))
const summary = computed(() => summarize(records.value, activeRegions.value))
const trend = computed(() => buildTrend(records.value, activeRegions.value))

const rangeLabel = computed(() => {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(filters.value.start)} – ${fmt(filters.value.end)}`
})

const scopeLabel = computed(() =>
  filters.value.region === 'all' ? 'All regions' : `${filters.value.region} region`,
)

const granularityNote = computed(() => {
  const g = trend.value.granularity
  return g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'
})

const nf = new Intl.NumberFormat('en-US')

const kpis = computed(() => {
  const s = summary.value
  const regionKpi =
    filters.value.region === 'all'
      ? { title: 'Top Region', value: s.bestRegion.name, sub: `${(s.bestRegion.rate * 100).toFixed(1)}% on-time` }
      : { title: 'Region', value: filters.value.region, sub: `${(s.onTimeRate * 100).toFixed(1)}% on-time` }

  return [
    {
      title: 'Total Shipments',
      value: nf.format(s.totalShipments),
      icon: 'mdi-package-variant-closed',
      color: 'primary',
    },
    {
      title: 'On-Time Delivery',
      value: `${(s.onTimeRate * 100).toFixed(1)}%`,
      icon: 'mdi-clock-check-outline',
      color: 'success',
    },
    {
      title: 'Open Exceptions',
      value: nf.format(s.openExceptions),
      icon: 'mdi-alert-circle-outline',
      color: 'warning',
    },
    { ...regionKpi, icon: 'mdi-map-marker-radius-outline', color: 'info' },
  ]
})

// --- Chart datasets (theme-aware) ------------------------------------------

function trendLine(label: string, data: number[], color: string) {
  return {
    labels: trend.value.labels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: trend.value.labels.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
      },
    ],
  }
}

const volumeData = computed(() => trendLine('Shipments', trend.value.shipments, palette.value.primary!))
const onTimeData = computed(() => trendLine('On-Time Rate', trend.value.onTimeRate, palette.value.success!))
const satisfactionData = computed(() =>
  trendLine('Satisfaction', trend.value.satisfaction, palette.value.info!),
)

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
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h5 font-weight-bold">Operations Overview</h1>
      <div class="text-body-2 text-medium-emphasis">
        {{ rangeLabel }} · {{ granularityNote }} view · {{ scopeLabel }}
      </div>
    </div>

    <DashboardFilters class="mb-6" @change="filters = $event" />

    <v-row>
      <v-col v-for="kpi in kpis" :key="kpi.title" cols="12" sm="6" md="3">
        <KpiCard v-bind="kpi" />
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12" md="8">
        <ChartCard title="Shipment Volume" subtitle="Total packages dispatched over the selected period">
          <LineChart :data="volumeData" :height="320" />
        </ChartCard>
      </v-col>
      <v-col cols="12" md="4">
        <ChartCard title="Open Exceptions" subtitle="By exception type">
          <DoughnutChart :data="exceptionData" :height="320" />
        </ChartCard>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12" md="6">
        <ChartCard title="On-Time Delivery Rate" subtitle="Percent of shipments delivered on schedule">
          <LineChart :data="onTimeData" :height="300" percent-axis :suggested-min="80" :suggested-max="100" />
        </ChartCard>
      </v-col>
      <v-col cols="12" md="6">
        <ChartCard title="Regional Performance" subtitle="Shipment volume and reliability by region">
          <RegionPerformance :regions="summary.regions" />
        </ChartCard>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12">
        <ChartCard
          title="Customer Satisfaction"
          subtitle="CSAT score (0–100) driven by delivery outcomes — delays, damage, and lost packages drag it down"
        >
          <LineChart :data="satisfactionData" :height="300" :suggested-min="60" :suggested-max="100" />
        </ChartCard>
      </v-col>
    </v-row>
  </div>
</template>
