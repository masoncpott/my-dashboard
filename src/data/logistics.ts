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

const REGION_WEIGHTS: Record<Region, number> = {
  Northeast: 0.24,
  Southeast: 0.22,
  Midwest: 0.2,
  West: 0.2,
  Southwest: 0.14,
}

// Baseline on-time reliability per region (some lanes run tighter than others).
const REGION_RELIABILITY: Record<Region, number> = {
  Northeast: 0.93,
  Southeast: 0.945,
  Midwest: 0.955,
  West: 0.935,
  Southwest: 0.925,
}

const EXCEPTION_WEIGHTS: Record<ExceptionType, number> = {
  Delayed: 0.5,
  'Address Issue': 0.18,
  'Customs Hold': 0.14,
  Damaged: 0.12,
  'Lost in Transit': 0.06,
}

function generateDay(index: number, date: Date): DayRecord {
  const rand = mulberry32(0x9e3779b9 ^ (index * 2654435761))
  const dow = date.getDay() // 0 = Sun

  // Weekly seasonality: weekends are much lighter for freight ops.
  const weekendFactor = dow === 0 ? 0.45 : dow === 6 ? 0.6 : 1
  // Gentle long-term growth over the window.
  const trend = 1 + index * 0.00035
  // Holiday peak around Nov/Dec.
  const month = date.getMonth()
  const seasonal = month === 10 ? 1.18 : month === 11 ? 1.28 : month <= 1 ? 0.95 : 1
  const noise = 0.85 + rand() * 0.3

  const shipments = Math.round(2100 * weekendFactor * trend * seasonal * noise)

  // On-time rate dips slightly when volume surges.
  const surgePenalty = (seasonal - 1) * 0.06
  const onTimeRate = clamp(0.955 - surgePenalty + (rand() - 0.5) * 0.04, 0.86, 0.99)
  const onTime = Math.round(shipments * onTimeRate)

  // Regional split.
  const regions = {} as DayRecord['regions']
  let allocated = 0
  REGIONS.forEach((region, i) => {
    const isLast = i === REGIONS.length - 1
    const wobble = 0.92 + rand() * 0.16
    const rShip = isLast
      ? shipments - allocated
      : Math.round(shipments * REGION_WEIGHTS[region] * wobble)
    allocated += rShip
    const rRate = clamp(REGION_RELIABILITY[region] + (rand() - 0.5) * 0.05, 0.84, 0.99)
    regions[region] = { shipments: Math.max(0, rShip), onTime: Math.round(Math.max(0, rShip) * rRate) }
  })

  // Open exceptions are correlated with late shipments plus a small baseline.
  const late = shipments - onTime
  const exceptionTotal = Math.round(late * 0.55 + 8 + rand() * 30)
  const exceptions = {} as DayRecord['exceptions']
  let exAllocated = 0
  EXCEPTION_TYPES.forEach((type, i) => {
    const isLast = i === EXCEPTION_TYPES.length - 1
    const wobble = 0.85 + rand() * 0.3
    const count = isLast
      ? exceptionTotal - exAllocated
      : Math.round(exceptionTotal * EXCEPTION_WEIGHTS[type] * wobble)
    exAllocated += count
    exceptions[type] = Math.max(0, count)
  })

  return { date: toISODate(date), shipments, onTime, regions, exceptions }
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
    out.push(generateDay(i, addDays(MIN_DATE, i)))
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

export function summarize(records: DayRecord[]): Summary {
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
    totalShipments += r.shipments
    totalOnTime += r.onTime
    for (const region of REGIONS) {
      regionTotals[region].shipments += r.regions[region].shipments
      regionTotals[region].onTime += r.regions[region].onTime
    }
    for (const type of EXCEPTION_TYPES) {
      const c = r.exceptions[type]
      exTotals[type] += c
      openExceptions += c
    }
  }

  const regions = REGIONS.map((name) => ({
    name,
    shipments: regionTotals[name].shipments,
    onTimeRate: regionTotals[name].shipments
      ? regionTotals[name].onTime / regionTotals[name].shipments
      : 0,
  }))

  const best = regions.reduce(
    (acc, r) => (r.onTimeRate > acc.rate ? { name: r.name, rate: r.onTimeRate } : acc),
    { name: REGIONS[0] as Region, rate: 0 },
  )

  return {
    totalShipments,
    onTimeRate: totalShipments ? totalOnTime / totalShipments : 0,
    openExceptions,
    bestRegion: best,
    regions,
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

/** Builds a time series, auto-bucketing by day/week/month based on span. */
export function buildTrend(records: DayRecord[]): TrendSeries {
  if (records.length === 0) {
    return { labels: [], shipments: [], onTimeRate: [], granularity: 'day' }
  }

  const span = records.length
  const granularity: TrendSeries['granularity'] =
    span <= 45 ? 'day' : span <= 270 ? 'week' : 'month'

  const buckets = new Map<string, { label: string; sort: string; shipments: number; onTime: number }>()

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

    const b = buckets.get(key) ?? { label, sort, shipments: 0, onTime: 0 }
    b.shipments += r.shipments
    b.onTime += r.onTime
    buckets.set(key, b)
  }

  const ordered = [...buckets.values()].sort((a, b) => a.sort.localeCompare(b.sort))
  return {
    labels: ordered.map((b) => b.label),
    shipments: ordered.map((b) => b.shipments),
    onTimeRate: ordered.map((b) => (b.shipments ? (b.onTime / b.shipments) * 100 : 0)),
    granularity,
  }
}
