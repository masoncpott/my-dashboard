<script lang="ts">
import type { Region } from '../data/logistics'

export interface AppliedFilters {
  start: Date
  end: Date
  region: Region | 'all'
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  MIN_DATE,
  MAX_DATE,
  toISODate,
  parseISODate,
  addDays,
  REGIONS,
} from '../data/logistics'

const emit = defineEmits<{
  change: [filters: AppliedFilters]
}>()

const minISO = toISODate(MIN_DATE)
const maxISO = toISODate(MAX_DATE)

// --- Region ----------------------------------------------------------------

const ALL = 'all' as const
const selectedRegion = ref<Region | typeof ALL>(ALL)
const regionOptions = [
  { title: 'All Regions', value: ALL },
  ...REGIONS.map((r) => ({ title: r, value: r })),
]

// --- Date range ------------------------------------------------------------

const defaultStart = addDays(MAX_DATE, -89)
const startInput = ref(toISODate(defaultStart))
const endInput = ref(maxISO)

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

// Last known-valid range; charts keep showing this while inputs are invalid.
const appliedStart = ref<Date>(defaultStart)
const appliedEnd = ref<Date>(MAX_DATE)

watch(
  validation,
  (v) => {
    if (v.ok && v.start && v.end) {
      appliedStart.value = v.start
      appliedEnd.value = v.end
    }
  },
  { immediate: true },
)

watch(
  [appliedStart, appliedEnd, selectedRegion],
  () => {
    emit('change', {
      start: appliedStart.value,
      end: appliedEnd.value,
      region: selectedRegion.value,
    })
  },
  { immediate: true },
)

// --- Presets ---------------------------------------------------------------

type PresetKey = '7d' | '30d' | '90d' | 'ytd' | '12m' | 'all'
const presets: { key: PresetKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'ytd', label: 'YTD' },
  { key: '12m', label: '12M' },
  { key: 'all', label: 'All' },
]

function presetStart(key: PresetKey): Date {
  switch (key) {
    case '7d':
      return addDays(MAX_DATE, -6)
    case '30d':
      return addDays(MAX_DATE, -29)
    case '90d':
      return addDays(MAX_DATE, -89)
    case 'ytd':
      return new Date(MAX_DATE.getFullYear(), 0, 1)
    case '12m':
      return addDays(MAX_DATE, -364)
    case 'all':
      return MIN_DATE
  }
}

function applyPreset(key: PresetKey) {
  let start = presetStart(key)
  if (start < MIN_DATE) start = MIN_DATE
  startInput.value = toISODate(start)
  endInput.value = maxISO
}

const activePreset = computed<PresetKey | null>(() => {
  if (!validation.value.ok || endInput.value !== maxISO) return null
  const match = presets.find((p) => startInput.value === toISODate(presetStart(p.key)))
  return match?.key ?? null
})
</script>

<template>
  <v-card flat border rounded="lg">
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
        <v-select
          v-model="selectedRegion"
          :items="regionOptions"
          label="Region"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-map-marker-outline"
          style="min-width: 180px"
        />
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
</template>
