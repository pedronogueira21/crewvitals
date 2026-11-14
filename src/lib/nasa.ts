// NASA data (SPEC.md section 6): request URLs, snapshot files, and the pure
// functions that turn raw upstream JSON into the shapes the app shows.
// Used by the Pages Functions in /functions/api/ and, when /api is not
// available (plain `npm run dev`), by the browser on the bundled snapshots,
// so live and snapshot data go through exactly the same code.
//
// Every summarize/parse function throws on an unexpected shape, so a changed
// upstream API falls back to the snapshot instead of showing nonsense.

/** Date the files in public/snapshots/ were fetched. */
export const SNAPSHOT_RETRIEVED = '2026-11-14'

export type Mode = 'live' | 'snapshot'
export type ApiResult<T> = { mode: Mode; /** ISO date */ retrieved: string; data: T }

function fail(what: string): never {
  throw new Error(`Unexpected ${what} response shape`)
}

// ---------------------------------------------------------------------------
// DONKI space weather (6.1)
// ---------------------------------------------------------------------------

export const DONKI_BASE = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/'
/** The window the DONKI snapshots cover. */
export const DONKI_SNAPSHOT_WINDOW = { start: '2026-11-07', end: '2026-11-14' }
export const DONKI_SNAPSHOTS = { flr: '/snapshots/donki-flr.json', sep: '/snapshots/donki-sep.json' }

export function donkiUrl(kind: 'FLR' | 'SEP', start: string, end: string): string {
  return `${DONKI_BASE}${kind}?startDate=${start}&endDate=${end}`
}

export type SpaceWeatherEvent = {
  kind: 'flare' | 'sep'
  /** ISO time: flare peak time, or SEP event time. */
  time: string
  /** Flare class such as "X1.2"; absent for SEP events. */
  classType?: string
  link: string
}

export type SpaceWeather = {
  window: { start: string; end: string }
  /** SEP events and X-class flares in the window. Empty means no alert. */
  alerts: SpaceWeatherEvent[]
  latestFlare: SpaceWeatherEvent | null
  flareCount: number
}

type Raw = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

export function summarizeSpaceWeather(
  flr: unknown,
  sep: unknown,
  window: { start: string; end: string },
): SpaceWeather {
  if (!Array.isArray(flr) || !Array.isArray(sep)) fail('DONKI')
  const flares: SpaceWeatherEvent[] = (flr as Raw[]).flatMap((f) => {
    const time = str(f.peakTime) ?? str(f.beginTime)
    const classType = str(f.classType)
    return time && classType ? [{ kind: 'flare' as const, time, classType, link: str(f.link) ?? '' }] : []
  })
  const seps: SpaceWeatherEvent[] = (sep as Raw[]).flatMap((s) => {
    const time = str(s.eventTime)
    return time ? [{ kind: 'sep' as const, time, link: str(s.link) ?? '' }] : []
  })
  const byTime = (a: SpaceWeatherEvent, b: SpaceWeatherEvent) => b.time.localeCompare(a.time)
  return {
    window,
    alerts: [...seps, ...flares.filter((f) => f.classType!.toUpperCase().startsWith('X'))].sort(byTime),
    latestFlare: [...flares].sort(byTime)[0] ?? null,
    flareCount: flares.length,
  }
}

// ---------------------------------------------------------------------------
// OSDR related studies (6.2)
// ---------------------------------------------------------------------------

/**
 * Keyword per topic. "circadian" replaces the spec's "sleep circadian", which
 * returned only 3 hits on 2026-11-14 ("circadian" returned 9).
 */
export const STUDY_KEYWORDS = [
  'cardiovascular',
  'glucose',
  'immune',
  'circadian',
  'behavior',
  'bone loss',
  'radiation',
] as const
export type StudyKeyword = (typeof STUDY_KEYWORDS)[number]

export function isStudyKeyword(term: unknown): term is StudyKeyword {
  return STUDY_KEYWORDS.includes(term as StudyKeyword)
}

export function osdrUrl(term: StudyKeyword): string {
  return `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(term)}&from=0&size=5&type=cgene`
}

export function osdrSnapshot(term: StudyKeyword): string {
  return `/snapshots/osdr-${term.replace(/ /g, '-')}.json`
}

export type Study = {
  accession: string
  title: string
  organism: string
  projectType: string
  url: string
}
export type Studies = { term: StudyKeyword; total: number; studies: Study[] }

export function parseStudies(json: unknown, term: StudyKeyword): Studies {
  const hits = (json as { hits?: { total?: unknown; hits?: unknown } } | null)?.hits
  if (!hits || !Array.isArray(hits.hits)) fail('OSDR')
  const studies = (hits.hits as { _source?: Raw }[]).flatMap(({ _source: s }) => {
    const accession = str(s?.['Accession'])
    const title = str(s?.['Study Title'])
    if (!accession || !title) return []
    return [
      {
        accession,
        title,
        organism: str(s?.['organism']) || 'Organism not stated',
        projectType: str(s?.['Project Type']) || 'Study type not stated',
        url: `https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(accession)}`,
      },
    ]
  })
  const total = typeof hits.total === 'number' ? hits.total : studies.length
  return { term, total, studies }
}

// ---------------------------------------------------------------------------
// RadLab radiation dose (6.3)
// ---------------------------------------------------------------------------

/**
 * The one calendar day used for every environment, so the comparison covers
 * the same space-weather period. 1 Dec 2022 is the only day between 17 Nov
 * and 11 Dec 2022 on which TGO Liulin-MO has no multi-hour gap; the other
 * five instruments have full days at their normal cadence.
 */
export const RADLAB_DAY = '2022-12-01'

/** Six measured environments, each one spacecraft and one instrument. */
export const RADIATION_ENVIRONMENTS = [
  { id: 'iss', name: 'ISS', instrumentId: 'DosTel1' },
  { id: 'lunar-orbit', name: 'Lunar orbit', instrumentId: 'CRaTER-D1D2' },
  { id: 'cislunar-orion', name: 'Cislunar flight inside Orion', instrumentId: 'Artemis-I-HERA-HSU1' },
  { id: 'deep-space', name: 'Deep space', instrumentId: 'BPD' },
  { id: 'mars-orbit', name: 'Mars orbit', instrumentId: 'Liulin-MO-AB-Orbit' },
  { id: 'mars-surface', name: 'Mars surface', instrumentId: 'MSL-RAD-Surface' },
] as const
export type EnvironmentId = (typeof RADIATION_ENVIRONMENTS)[number]['id']

export function environment(id: unknown) {
  return RADIATION_ENVIRONMENTS.find((e) => e.id === id)
}

export function radlabSnapshot(id: EnvironmentId): string {
  return `/snapshots/radlab-${id}.json`
}

/** Readings this far either side of the day are fetched so the dose can be integrated exactly from 00:00 to 24:00. */
const PAD_HOURS = 6

export function radlabUrl(id: EnvironmentId): string {
  const env = environment(id)!
  const day = Date.parse(`${RADLAB_DAY}T00:00:00Z`)
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16)
  return (
    'https://visualization.osdr.nasa.gov/radlab/api/' +
    `?instrument_id=${encodeURIComponent(env.instrumentId)}` +
    `&timestamp%3E=${encodeURIComponent(iso(day - PAD_HOURS * 3_600_000))}` +
    `&timestamp%3C${encodeURIComponent(iso(day + (24 + PAD_HOURS) * 3_600_000))}` +
    '&absorbed_dose_rate&spacecraft&instrument&instrument_family&trajectory' +
    (id === 'iss' ? '&latitude&longitude' : '') +
    '&format=json'
  )
}

/** Readings above this rate (µGy/h) are checked for a geographic cluster (ISS only: the only one with positions). */
export const HIGH_RATE = 100

/**
 * Area tested for the ISS cluster, found by looking at the data. The sentence
 * is shown only when the data itself puts nearly all high readings inside it.
 */
const CLUSTER_AREA = {
  lat: [-50, -5],
  lon: [-80, -10],
  words: 'over southern South America and the nearby South Atlantic Ocean',
  minShare: 0.9,
}

export type HighRateCluster = {
  threshold: number
  count: number
  inside: number
  latRange: [number, number]
  lonRange: [number, number]
  words?: string
}

export type EnvironmentDose = {
  id: EnvironmentId
  name: string
  instrumentId: string
  /** As given by RadLab for this instrument. RadLab does not expose a data source or agency. */
  radlab: { spacecraft: string; instrument: string; instrumentFamily: string; trajectory: string }
  day: string
  /** Absorbed dose integrated over the calendar day (00:00–24:00, RadLab timestamps), µGy. */
  dailyDose: number
  hoursCovered: number
  longestGapMinutes: number
  /** Readings within the day. */
  readings: number
  mean: number
  median: number
  max: number
  maxAt: { time: string; lat?: number; lon?: number }
  /** [hours since 00:00, µGy/h]; 5-minute averages when the day has more than 300 readings. */
  series: [number, number][]
  seriesNote: 'readings' | '5-minute averages'
  highRate: HighRateCluster | null
}

type Reading = { t: number; time: string; rate: number; lat?: number; lon?: number }

/** RadLab timestamps carry no zone; they are only compared with each other. */
const toMs = (ts: string) => Date.parse(`${ts}Z`)

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Dose over [start, end] by the trapezoid rule on the readings, which are
 * joined by straight lines (so gaps are bridged) and cut at the window edges
 * by linear interpolation. Times in ms, rates in µGy/h, dose in µGy.
 */
export function integrateWindow(
  readings: { t: number; rate: number }[],
  start: number,
  end: number,
): { dose: number; hours: number; longestGap: number } {
  let dose = 0
  let ms = 0
  let longestGap = 0
  for (let i = 1; i < readings.length; i++) {
    const a = readings[i - 1], b = readings[i]
    const from = Math.max(a.t, start), to = Math.min(b.t, end)
    if (to <= from) continue
    const at = (t: number) => a.rate + ((b.rate - a.rate) * (t - a.t)) / (b.t - a.t)
    dose += ((at(from) + at(to)) / 2) * ((to - from) / 3_600_000)
    ms += to - from
    longestGap = Math.max(longestGap, (b.t - a.t) / 3_600_000)
  }
  return { dose, hours: ms / 3_600_000, longestGap }
}

function downsample(readings: Reading[], dayStart: number): { series: [number, number][]; note: EnvironmentDose['seriesNote'] } {
  const h = (t: number) => Math.round(((t - dayStart) / 3_600_000) * 1000) / 1000
  if (readings.length <= 300) return { series: readings.map((r) => [h(r.t), r.rate]), note: 'readings' }
  const bins = new Map<number, number[]>()
  for (const r of readings) {
    const bin = Math.floor((r.t - dayStart) / 300_000)
    if (!bins.has(bin)) bins.set(bin, [])
    bins.get(bin)!.push(r.rate)
  }
  const series = [...bins.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bin, rates]): [number, number] => [h(dayStart + bin * 300_000 + 150_000), rates.reduce((s, r) => s + r, 0) / rates.length])
  return { series, note: '5-minute averages' }
}

function highRateCluster(readings: Reading[]): HighRateCluster | null {
  const high = readings.filter((r) => r.rate > HIGH_RATE && r.lat !== undefined && r.lon !== undefined)
  if (high.length === 0) return null
  const { lat, lon } = CLUSTER_AREA
  const inside = high.filter((r) => r.lat! >= lat[0] && r.lat! <= lat[1] && r.lon! >= lon[0] && r.lon! <= lon[1]).length
  const range = (vs: number[]): [number, number] => [Math.min(...vs), Math.max(...vs)]
  return {
    threshold: HIGH_RATE,
    count: high.length,
    inside,
    latRange: range(high.map((r) => r.lat!)),
    lonRange: range(high.map((r) => r.lon!)),
    words: inside / high.length >= CLUSTER_AREA.minShare ? CLUSTER_AREA.words : undefined,
  }
}

export function summarizeEnvironment(json: unknown, id: EnvironmentId): EnvironmentDose {
  const env = environment(id)
  const { columns, data } = (json ?? {}) as { columns?: unknown; data?: unknown }
  if (!env || !Array.isArray(columns) || !Array.isArray(data)) fail('RadLab')
  // Map rows to objects by column name, never by position.
  const col = (name: string) => (columns as unknown[]).indexOf(name)
  const c = { time: col('timestamp'), id: col('instrument_id'), rate: col('absorbed_dose_rate'), lat: col('latitude'), lon: col('longitude') }
  if (c.time < 0 || c.id < 0 || c.rate < 0) fail('RadLab')
  const text = (row: unknown[], name: string) => {
    const i = col(name)
    return i >= 0 && typeof row[i] === 'string' ? (row[i] as string) : ''
  }

  const all: Reading[] = []
  let meta: unknown[] | undefined
  for (const row of data as unknown[][]) {
    const time = row[c.time], rate = row[c.rate]
    if (row[c.id] !== env.instrumentId || typeof time !== 'string' || typeof rate !== 'number' || !Number.isFinite(rate)) continue
    const t = toMs(time)
    if (Number.isNaN(t)) continue
    const lat = c.lat >= 0 && typeof row[c.lat] === 'number' ? (row[c.lat] as number) : undefined
    const lon = c.lon >= 0 && typeof row[c.lon] === 'number' ? (row[c.lon] as number) : undefined
    all.push({ t, time, rate, lat, lon })
    meta ??= row
  }
  all.sort((a, b) => a.t - b.t)

  const dayStart = toMs(`${RADLAB_DAY}T00:00:00`)
  const dayEnd = dayStart + 86_400_000
  const inDay = all.filter((r) => r.t >= dayStart && r.t < dayEnd)
  if (inDay.length < 2 || !meta) fail('RadLab')

  const { dose, hours, longestGap } = integrateWindow(all, dayStart, dayEnd)
  const rates = inDay.map((r) => r.rate).sort((a, b) => a - b)
  const peak = inDay.reduce((m, r) => (r.rate > m.rate ? r : m))
  const { series, note } = downsample(inDay, dayStart)

  return {
    id: env.id,
    name: env.name,
    instrumentId: env.instrumentId,
    radlab: {
      spacecraft: text(meta, 'spacecraft'),
      instrument: text(meta, 'instrument'),
      instrumentFamily: text(meta, 'instrument_family'),
      trajectory: text(meta, 'trajectory'),
    },
    day: RADLAB_DAY,
    dailyDose: dose,
    hoursCovered: hours,
    longestGapMinutes: longestGap * 60,
    readings: inDay.length,
    mean: rates.reduce((s, r) => s + r, 0) / rates.length,
    median: median(rates),
    max: peak.rate,
    maxAt: { time: peak.time, lat: peak.lat, lon: peak.lon },
    series,
    seriesNote: note,
    highRate: highRateCluster(inDay),
  }
}
