// Mock data layer for the FastForward Logistics executive dashboard.
// Generates deterministic, realistic-looking daily operations data from
// 2024-01-01 through "today" so charts stay stable across reloads.

export const REGIONS = [
  'Northeast',
  'Southeast',
  'Midwest',
  'Southwest',
  'West',
] as const
export type Region = (typeof REGIONS)[number]

export const EXCEPTION_TYPES = [
  'Delayed',
  'Customs Hold',
  'Address Issue',
  'Damaged',
  'Lost in Transit',
] as const
export type ExceptionType = (typeof EXCEPTION_TYPES)[number]

export interface DayRecord {
  /** Local date key, formatted yyyy-mm-dd. */
  date: string
  shipments: number
  onTime: number
  regions: Record<Region, { shipments: number; onTime: number }>
  exceptions: Record<ExceptionType, number>
}

// --- Date window -----------------------------------------------------------

/** Earliest selectable date. */
export const MIN_DATE = startOfDay(new Date(2024, 0, 1))
/** Latest selectable date ("today"). */
export const MAX_DATE = startOfDay(new Date())

export function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : startOfDay(d)
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return startOfDay(c)
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

// --- Deterministic generation ---------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const EXCEPTION_WEIGHTS: Record<ExceptionType, number> = {
  Delayed: 0.5,
  'Address Issue': 0.18,
  'Customs Hold': 0.14,
  Damaged: 0.12,
  'Lost in Transit': 0.06,
}

/**
 * Each region has its own trajectory so filtering tells a distinct story:
 *  - baseVolume       avg daily shipments at the start of the window
 *  - growth           multiplicative change across the full window
 *                     (>1 expanding, <1 contracting)
 *  - seasonalAmp      sensitivity to the Nov/Dec holiday peak
 *  - volatility       day-to-day noise amplitude
 *  - reliabilityStart / reliabilityEnd  on-time rate drifts over time
 */
interface RegionProfile {
  baseVolume: number
  growth: number
  seasonalAmp: number
  volatility: number
  reliabilityStart: number
  reliabilityEnd: number
}

const REGION_PROFILES: Record<Region, RegionProfile> = {
  // Mature flagship market: large, steady, dependable — the backbone.
  Northeast: {
    baseVolume: 520,
    growth: 1.05,
    seasonalAmp: 1,
    volatility: 0.12,
    reliabilityStart: 0.93,
    reliabilityEnd: 0.935,
  },
  // Growth story: started small, expanding fast as the network invests and
  // operations mature — volume more than doubles and reliability climbs.
  Southeast: {
    baseVolume: 240,
    growth: 2.3,
    seasonalAmp: 1.1,
    volatility: 0.18,
    reliabilityStart: 0.9,
    reliabilityEnd: 0.95,
  },
  // Operational gold standard: steady moderate growth, best-in-class on-time.
  Midwest: {
    baseVolume: 430,
    growth: 1.15,
    seasonalAmp: 0.9,
    volatility: 0.1,
    reliabilityStart: 0.955,
    reliabilityEnd: 0.96,
  },
  // Decline story: losing business and slipping operationally — volume nearly
  // halves while on-time rate erodes, prompting the "why?" conversation.
  Southwest: {
    baseVolume: 460,
    growth: 0.5,
    seasonalAmp: 1,
    volatility: 0.16,
    reliabilityStart: 0.94,
    reliabilityEnd: 0.88,
  },
  // Volatile, highly seasonal market: bumpy week to week with strong holiday
  // peaks, growing overall but unpredictable.
  West: {
    baseVolume: 360,
    growth: 1.35,
    seasonalAmp: 1.4,
    volatility: 0.26,
    reliabilityStart: 0.925,
    reliabilityEnd: 0.93,
  },
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function generateDay(index: number, date: Date, total: number): DayRecord {
  const dow = date.getDay() // 0 = Sun
  const month = date.getMonth()
  // Progress through the window, 0 at the start and 1 at "today".
  const progress = total > 0 ? index / total : 0

  // Weekly seasonality: weekends are much lighter for freight ops.
  const weekendFactor = dow === 0 ? 0.45 : dow === 6 ? 0.6 : 1
  // Holiday peak around Nov/Dec, soft dip in Jan/Feb. Scaled per region.
  const seasonalPeak = month === 10 ? 0.18 : month === 11 ? 0.28 : month <= 1 ? -0.05 : 0

  const regions = {} as DayRecord['regions']
  let totalShipments = 0
  let totalOnTime = 0

  REGIONS.forEach((region, i) => {
    const p = REGION_PROFILES[region]
    // Independent deterministic stream per region per day.
    const rand = mulberry32(0x9e3779b9 ^ (index * 2654435761) ^ ((i + 1) * 0x85ebca6b))

    // Compound the region's own growth/decline across the window.
    const trend = Math.pow(p.growth, progress)
    const seasonal = 1 + seasonalPeak * p.seasonalAmp
    const noise = 1 - p.volatility / 2 + rand() * p.volatility

    const shipments = Math.max(0, Math.round(p.baseVolume * trend * seasonal * weekendFactor * noise))

    // Reliability drifts from start to end, dips a little during volume surges.
    const baseReliability = lerp(p.reliabilityStart, p.reliabilityEnd, progress)
    const surgePenalty = Math.max(0, seasonalPeak) * p.seasonalAmp * 0.15
    const onTimeRate = clamp(baseReliability - surgePenalty + (rand() - 0.5) * 0.03, 0.8, 0.99)
    const onTime = Math.round(shipments * onTimeRate)

    regions[region] = { shipments, onTime }
    totalShipments += shipments
    totalOnTime += onTime
  })

  // Open exceptions are correlated with network-wide late shipments.
  const exRand = mulberry32(0x27d4eb2f ^ (index * 2246822519))
  const late = totalShipments - totalOnTime
  const exceptionTotal = Math.round(late * 0.55 + 8 + exRand() * 30)
  const exceptions = {} as DayRecord['exceptions']
  let exAllocated = 0
  EXCEPTION_TYPES.forEach((type, i) => {
    const isLast = i === EXCEPTION_TYPES.length - 1
    const wobble = 0.85 + exRand() * 0.3
    const count = isLast
      ? exceptionTotal - exAllocated
      : Math.round(exceptionTotal * EXCEPTION_WEIGHTS[type] * wobble)
    exAllocated += count
    exceptions[type] = Math.max(0, count)
  })

  return { date: toISODate(date), shipments: totalShipments, onTime: totalOnTime, regions, exceptions }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

let cache: DayRecord[] | null = null

/** Full daily dataset across the available window (memoized). */
export function getDailyData(): DayRecord[] {
  if (cache) return cache
  const total = daysBetween(MIN_DATE, MAX_DATE)
  const out: DayRecord[] = []
  for (let i = 0; i <= total; i++) {
    out.push(generateDay(i, addDays(MIN_DATE, i), total))
  }
  cache = out
  return out
}

/** Records whose date falls within [start, end] inclusive. */
export function getRange(start: Date, end: Date): DayRecord[] {
  const s = toISODate(start)
  const e = toISODate(end)
  return getDailyData().filter((r) => r.date >= s && r.date <= e)
}

// --- Aggregation -----------------------------------------------------------

export interface Summary {
  totalShipments: number
  onTimeRate: number
  openExceptions: number
  bestRegion: { name: Region; rate: number }
  regions: { name: Region; shipments: number; onTimeRate: number }[]
  exceptions: { type: ExceptionType; count: number }[]
}

/**
 * Fraction of a day's network-wide late shipments attributable to the given
 * regions. Used to apportion day-level exceptions when filtering by region.
 */
function lateShare(record: DayRecord, regions: Region[]): number {
  const networkLate = record.shipments - record.onTime
  if (networkLate <= 0) return regions.length === REGIONS.length ? 1 : 0
  let selectedLate = 0
  for (const region of regions) {
    selectedLate += record.regions[region].shipments - record.regions[region].onTime
  }
  return Math.max(0, Math.min(1, selectedLate / networkLate))
}

/**
 * Summarize records, optionally scoped to a subset of regions. When `regions`
 * is omitted (or all regions) the full network is summarized.
 */
export function summarize(records: DayRecord[], regions: Region[] = [...REGIONS]): Summary {
  const selected = regions.length ? regions : [...REGIONS]

  let totalShipments = 0
  let totalOnTime = 0
  let openExceptions = 0

  const regionTotals: Record<Region, { shipments: number; onTime: number }> = {
    Northeast: { shipments: 0, onTime: 0 },
    Southeast: { shipments: 0, onTime: 0 },
    Midwest: { shipments: 0, onTime: 0 },
    Southwest: { shipments: 0, onTime: 0 },
    West: { shipments: 0, onTime: 0 },
  }
  const exTotals: Record<ExceptionType, number> = {
    Delayed: 0,
    'Customs Hold': 0,
    'Address Issue': 0,
    Damaged: 0,
    'Lost in Transit': 0,
  }

  for (const r of records) {
    for (const region of selected) {
      totalShipments += r.regions[region].shipments
      totalOnTime += r.regions[region].onTime
      regionTotals[region].shipments += r.regions[region].shipments
      regionTotals[region].onTime += r.regions[region].onTime
    }
    const share = lateShare(r, selected)
    for (const type of EXCEPTION_TYPES) {
      const c = Math.round(r.exceptions[type] * share)
      exTotals[type] += c
      openExceptions += c
    }
  }

  const regions_ = selected.map((name) => ({
    name,
    shipments: regionTotals[name].shipments,
    onTimeRate: regionTotals[name].shipments
      ? regionTotals[name].onTime / regionTotals[name].shipments
      : 0,
  }))

  const best = regions_.reduce(
    (acc, r) => (r.onTimeRate > acc.rate ? { name: r.name, rate: r.onTimeRate } : acc),
    { name: selected[0] as Region, rate: 0 },
  )

  return {
    totalShipments,
    onTimeRate: totalShipments ? totalOnTime / totalShipments : 0,
    openExceptions,
    bestRegion: best,
    regions: regions_,
    exceptions: EXCEPTION_TYPES.map((type) => ({ type, count: exTotals[type] })),
  }
}

// --- Trend bucketing -------------------------------------------------------

export interface TrendSeries {
  labels: string[]
  shipments: number[]
  onTimeRate: number[]
  granularity: 'day' | 'week' | 'month'
}

/**
 * Builds a time series, auto-bucketing by day/week/month based on span.
 * Optionally scoped to a subset of regions.
 */
export function buildTrend(records: DayRecord[], regions: Region[] = [...REGIONS]): TrendSeries {
  if (records.length === 0) {
    return { labels: [], shipments: [], onTimeRate: [], granularity: 'day' }
  }
  const selected = regions.length ? regions : [...REGIONS]

  const span = records.length
  const granularity: TrendSeries['granularity'] =
    span <= 45 ? 'day' : span <= 270 ? 'week' : 'month'

  const buckets = new Map<string, { label: string; sort: string; shipments: number; onTime: number; days: number }>()

  for (const r of records) {
    const d = parseISODate(r.date)!
    let key: string
    let label: string
    let sort: string
    if (granularity === 'day') {
      key = r.date
      sort = r.date
      label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (granularity === 'week') {
      const monday = addDays(d, -((d.getDay() + 6) % 7))
      key = toISODate(monday)
      sort = key
      label = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      sort = key
      label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }

    let shipments = 0
    let onTime = 0
    for (const region of selected) {
      shipments += r.regions[region].shipments
      onTime += r.regions[region].onTime
    }

    const b = buckets.get(key) ?? { label, sort, shipments: 0, onTime: 0, days: 0 }
    b.shipments += shipments
    b.onTime += onTime
    b.days += 1
    buckets.set(key, b)
  }

  const ordered = [...buckets.values()].sort((a, b) => a.sort.localeCompare(b.sort))

  // Drop an incomplete trailing bucket so a partial current week/month doesn't
  // read as a false "cliff" at the end of the trend.
  if (granularity !== 'day' && ordered.length > 1) {
    const last = ordered[ordered.length - 1]!
    const expected =
      granularity === 'week'
        ? 7
        : new Date(Number(last.sort.slice(0, 4)), Number(last.sort.slice(5, 7)), 0).getDate()
    if (last.days < expected) ordered.pop()
  }

  return {
    labels: ordered.map((b) => b.label),
    shipments: ordered.map((b) => b.shipments),
    onTimeRate: ordered.map((b) => (b.shipments ? (b.onTime / b.shipments) * 100 : 0)),
    granularity,
  }
}
