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

export interface RegionDay {
  shipments: number
  onTime: number
  exceptions: Record<ExceptionType, number>
}

export interface DayRecord {
  /** Local date key, formatted yyyy-mm-dd. */
  date: string
  shipments: number
  onTime: number
  regions: Record<Region, RegionDay>
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

// How much each exception type erodes customer satisfaction. Values are points
// of CSAT lost if 100% of shipments hit that issue (rates are small, so the
// realized penalty is a fraction of these). Severe failures hurt most.
const CSAT_PENALTY: Record<ExceptionType, number> = {
  Delayed: 60,
  'Customs Hold': 45,
  'Address Issue': 85,
  Damaged: 150,
  'Lost in Transit': 230,
}

/**
 * Each region has its own trajectory so filtering tells a distinct story:
 *  - baseVolume       avg daily shipments at the start of the window
 *  - growth           multiplicative change across the full window
 *                     (>1 expanding, <1 contracting)
 *  - seasonalAmp      sensitivity to the Nov/Dec holiday peak
 *  - volatility       day-to-day noise amplitude
 *  - reliabilityStart / reliabilityEnd  on-time rate drifts over time
 *  - coastal          coastal regions see port congestion → more Customs Holds
 *  - mix              relative split of "ordinary" exceptions across types
 */
interface RegionProfile {
  baseVolume: number
  growth: number
  seasonalAmp: number
  volatility: number
  reliabilityStart: number
  reliabilityEnd: number
  coastal: boolean
  mix: Record<ExceptionType, number>
}

// Exception personalities. Coastal regions lean on Customs Holds; inland
// regions see more last-mile Address Issues. Weights are relative (normalized).
const COASTAL_MIX: Record<ExceptionType, number> = {
  Delayed: 0.46,
  'Customs Hold': 0.26,
  'Address Issue': 0.13,
  Damaged: 0.1,
  'Lost in Transit': 0.05,
}
const INLAND_MIX: Record<ExceptionType, number> = {
  Delayed: 0.58,
  'Customs Hold': 0.03,
  'Address Issue': 0.24,
  Damaged: 0.1,
  'Lost in Transit': 0.05,
}

const REGION_PROFILES: Record<Region, RegionProfile> = {
  // Mature flagship market: large, steady, dependable — the backbone.
  // Coastal: major ports, so customs holds are a recurring drag.
  Northeast: {
    baseVolume: 520,
    growth: 1.05,
    seasonalAmp: 1,
    volatility: 0.12,
    reliabilityStart: 0.93,
    reliabilityEnd: 0.935,
    coastal: true,
    mix: COASTAL_MIX,
  },
  // Growth story: started small, expanding fast as the network invests and
  // operations mature — volume more than doubles and reliability climbs.
  // Coastal: heavy import gateway, customs holds spike during peak season.
  Southeast: {
    baseVolume: 240,
    growth: 2.3,
    seasonalAmp: 1.1,
    volatility: 0.18,
    reliabilityStart: 0.9,
    reliabilityEnd: 0.95,
    coastal: true,
    mix: COASTAL_MIX,
  },
  // Operational gold standard: steady moderate growth, best-in-class on-time.
  // Inland hub: very few customs issues.
  Midwest: {
    baseVolume: 430,
    growth: 1.15,
    seasonalAmp: 0.9,
    volatility: 0.1,
    reliabilityStart: 0.955,
    reliabilityEnd: 0.96,
    coastal: false,
    mix: INLAND_MIX,
  },
  // Decline story: losing business and slipping operationally — volume nearly
  // halves while on-time rate erodes. Also the site of the holiday package-
  // theft scandal (see HOLIDAY_THEFT_REGION).
  Southwest: {
    baseVolume: 460,
    growth: 0.5,
    seasonalAmp: 1,
    volatility: 0.16,
    reliabilityStart: 0.94,
    reliabilityEnd: 0.88,
    coastal: false,
    mix: INLAND_MIX,
  },
  // Volatile, highly seasonal market: bumpy week to week with strong holiday
  // peaks, growing overall but unpredictable. Coastal (West Coast ports).
  West: {
    baseVolume: 360,
    growth: 1.35,
    seasonalAmp: 1.4,
    volatility: 0.26,
    reliabilityStart: 0.925,
    reliabilityEnd: 0.93,
    coastal: true,
    mix: COASTAL_MIX,
  },
}

// Hidden story: every Nov/Dec a disgruntled employee in this region steals
// holiday gifts, spiking "Lost in Transit" until the internal investigation.
const HOLIDAY_THEFT_REGION: Region = 'Southwest'

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
  const isHoliday = month === 10 || month === 11

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

    // "Ordinary" exception rate: the gap from the region's reliability target,
    // worsening slightly when volume surges (peak-season strain).
    const baseReliability = lerp(p.reliabilityStart, p.reliabilityEnd, progress)
    const surgePenalty = Math.max(0, seasonalPeak) * p.seasonalAmp * 0.15
    const ordinaryRate = clamp(1 - baseReliability + surgePenalty + (rand() - 0.5) * 0.02, 0.01, 0.2)
    const ordinary = Math.round(shipments * ordinaryRate)

    // Distribute ordinary exceptions across types using the region's mix.
    const exceptions = {} as Record<ExceptionType, number>
    let allocated = 0
    EXCEPTION_TYPES.forEach((type, j) => {
      const isLast = j === EXCEPTION_TYPES.length - 1
      const wobble = 0.85 + rand() * 0.3
      const count = isLast ? ordinary - allocated : Math.round(ordinary * p.mix[type] * wobble)
      allocated += count
      exceptions[type] = Math.max(0, count)
    })

    // Coastal port congestion: extra Customs Holds, much worse at peak season.
    if (p.coastal) {
      const congestion = 0.006 + Math.max(0, seasonalPeak) * 0.05
      exceptions['Customs Hold'] += Math.round(shipments * congestion * (0.7 + rand() * 0.6))
    }

    // Holiday gift-theft scandal: one region loses a spike of packages each
    // Nov/Dec. The internal investigation was opened on the back of this data.
    if (region === HOLIDAY_THEFT_REGION && isHoliday) {
      const theftRate = 0.04 + rand() * 0.03
      exceptions['Lost in Transit'] += Math.round(shipments * theftRate)
    }

    // On-time = shipments that hit no exception. Keeps every metric consistent.
    let totalExceptions = 0
    for (const type of EXCEPTION_TYPES) totalExceptions += exceptions[type]
    const onTime = Math.max(0, shipments - totalExceptions)

    regions[region] = { shipments, onTime, exceptions }
    totalShipments += shipments
    totalOnTime += onTime
  })

  return { date: toISODate(date), shipments: totalShipments, onTime: totalOnTime, regions }
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
  satisfaction: number
  bestRegion: { name: Region; rate: number }
  regions: { name: Region; shipments: number; onTimeRate: number }[]
  exceptions: { type: ExceptionType; count: number }[]
}

/**
 * Customer satisfaction score (0–100) derived from delivery outcomes. On-time
 * deliveries keep customers happy; each exception type subtracts points scaled
 * by how much it upsets customers (a lost package hurts far more than a delay).
 */
export function satisfactionScore(
  shipments: number,
  exceptions: Record<ExceptionType, number>,
): number {
  if (shipments <= 0) return 0
  let penalty = 0
  for (const type of EXCEPTION_TYPES) {
    penalty += (exceptions[type] / shipments) * CSAT_PENALTY[type]
  }
  return clamp(100 - penalty, 0, 100)
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
      const rd = r.regions[region]
      totalShipments += rd.shipments
      totalOnTime += rd.onTime
      regionTotals[region].shipments += rd.shipments
      regionTotals[region].onTime += rd.onTime
      for (const type of EXCEPTION_TYPES) {
        const c = rd.exceptions[type]
        exTotals[type] += c
        openExceptions += c
      }
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
    satisfaction: satisfactionScore(totalShipments, exTotals),
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
  satisfaction: number[]
  granularity: 'day' | 'week' | 'month'
}

/**
 * Builds a time series, auto-bucketing by day/week/month based on span.
 * Optionally scoped to a subset of regions.
 */
export function buildTrend(records: DayRecord[], regions: Region[] = [...REGIONS]): TrendSeries {
  if (records.length === 0) {
    return { labels: [], shipments: [], onTimeRate: [], satisfaction: [], granularity: 'day' }
  }
  const selected = regions.length ? regions : [...REGIONS]

  const span = records.length
  const granularity: TrendSeries['granularity'] =
    span <= 45 ? 'day' : span <= 270 ? 'week' : 'month'

  type Bucket = {
    label: string
    sort: string
    shipments: number
    onTime: number
    exceptions: Record<ExceptionType, number>
    days: number
  }
  const buckets = new Map<string, Bucket>()

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
    const ex: Record<ExceptionType, number> = {
      Delayed: 0,
      'Customs Hold': 0,
      'Address Issue': 0,
      Damaged: 0,
      'Lost in Transit': 0,
    }
    for (const region of selected) {
      const rd = r.regions[region]
      shipments += rd.shipments
      onTime += rd.onTime
      for (const type of EXCEPTION_TYPES) ex[type] += rd.exceptions[type]
    }

    const b =
      buckets.get(key) ??
      {
        label,
        sort,
        shipments: 0,
        onTime: 0,
        exceptions: { Delayed: 0, 'Customs Hold': 0, 'Address Issue': 0, Damaged: 0, 'Lost in Transit': 0 },
        days: 0,
      }
    b.shipments += shipments
    b.onTime += onTime
    for (const type of EXCEPTION_TYPES) b.exceptions[type] += ex[type]
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
    satisfaction: ordered.map((b) => satisfactionScore(b.shipments, b.exceptions)),
    granularity,
  }
}
