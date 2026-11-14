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

/** The measured day, without the docs example's absorbed_dose_rate>2 filter. */
export const RADLAB_WINDOW = { start: '2022-04-01T00:00', end: '2022-04-02T00:00' }
export const RADLAB_SNAPSHOT = '/snapshots/radlab-24h.json'
export const RADLAB_URL =
  'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel' +
  `&timestamp%3E=${encodeURIComponent(RADLAB_WINDOW.start)}` +
  `&timestamp%3C${encodeURIComponent(RADLAB_WINDOW.end)}` +
  '&absorbed_dose_rate&latitude&longitude&format=json'

/** Readings above this rate (µGy/h) are checked for a geographic cluster. */
export const HIGH_RATE = 100

/**
 * Area tested for the cluster, found by looking at the 2022-04-01 data. The
 * sentence is shown only when the data itself puts nearly all high readings
 * inside it, so a different measured day cannot get a wrong description.
 */
const CLUSTER_AREA = {
  lat: [-50, -5],
  lon: [-80, -10],
  words: 'over southern South America and the nearby South Atlantic Ocean',
  minShare: 0.9,
}

export type InstrumentStats = {
  id: string
  readings: number
  /** RadLab timestamps of the first and last reading, as given. */
  first: string
  last: string
  /** Integral of the dose rate between the first and last reading, µGy. */
  dailyDose: number
  hoursCovered: number
  longestGapMinutes: number
  mean: number
  median: number
  max: number
  maxAt: { time: string; lat: number; lon: number }
  /** [hours since the first reading of the day, µGy/h] */
  series: [number, number][]
}

export type HighRateCluster = {
  threshold: number
  count: number
  /** Readings above the threshold inside the cluster area. */
  inside: number
  latRange: [number, number]
  lonRange: [number, number]
  /** Plain-words place, only when at least minShare of the readings are inside. */
  words?: string
}

export type Radiation = {
  instruments: InstrumentStats[]
  highRate: HighRateCluster | null
}

type Reading = { t: number; time: string; rate: number; lat: number; lon: number }

/** RadLab timestamps carry no zone; they are only compared with each other. */
const toMs = (ts: string) => Date.parse(`${ts}Z`)

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Daily dose by the trapezoid rule over consecutive readings, which bridges a
 * gap between readings with a straight line. The longest gap is reported.
 */
export function integrateDose(readings: { t: number; rate: number }[]): { dose: number; hours: number; longestGap: number } {
  let dose = 0
  let longestGap = 0
  for (let i = 1; i < readings.length; i++) {
    const hours = (readings[i].t - readings[i - 1].t) / 3_600_000
    dose += ((readings[i].rate + readings[i - 1].rate) / 2) * hours
    longestGap = Math.max(longestGap, hours)
  }
  const hours = readings.length > 1 ? (readings.at(-1)!.t - readings[0].t) / 3_600_000 : 0
  return { dose, hours, longestGap }
}

export function summarizeRadiation(json: unknown): Radiation {
  const { columns, data } = (json ?? {}) as { columns?: unknown; data?: unknown }
  if (!Array.isArray(columns) || !Array.isArray(data)) fail('RadLab')
  // Map rows to objects by column name, never by position.
  const col = (name: string) => (columns as unknown[]).indexOf(name)
  const c = { time: col('timestamp'), id: col('instrument_id'), rate: col('absorbed_dose_rate'), lat: col('latitude'), lon: col('longitude') }
  if (Object.values(c).some((i) => i < 0)) fail('RadLab')

  const byInstrument = new Map<string, Reading[]>()
  for (const row of data as unknown[][]) {
    const time = row[c.time], id = row[c.id], rate = row[c.rate], lat = row[c.lat], lon = row[c.lon]
    if (typeof time !== 'string' || typeof id !== 'string' || typeof rate !== 'number' || !Number.isFinite(rate)) continue
    if (typeof lat !== 'number' || typeof lon !== 'number') continue
    const t = toMs(time)
    if (Number.isNaN(t)) continue
    if (!byInstrument.has(id)) byInstrument.set(id, [])
    byInstrument.get(id)!.push({ t, time, rate, lat, lon })
  }
  if (byInstrument.size === 0) fail('RadLab')

  const instruments = [...byInstrument.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, readings]): InstrumentStats => {
      readings.sort((a, b) => a.t - b.t)
      const rates = readings.map((r) => r.rate).sort((a, b) => a - b)
      const peak = readings.reduce((m, r) => (r.rate > m.rate ? r : m))
      const { dose, hours, longestGap } = integrateDose(readings)
      return {
        id,
        readings: readings.length,
        first: readings[0].time,
        last: readings.at(-1)!.time,
        dailyDose: dose,
        hoursCovered: hours,
        longestGapMinutes: longestGap * 60,
        mean: rates.reduce((s, r) => s + r, 0) / rates.length,
        median: median(rates),
        max: peak.rate,
        maxAt: { time: peak.time, lat: peak.lat, lon: peak.lon },
        series: readings.map((r) => [Math.round(((r.t - readings[0].t) / 3_600_000) * 1000) / 1000, r.rate]),
      }
    })

  const high = [...byInstrument.values()].flat().filter((r) => r.rate > HIGH_RATE)
  let highRate: HighRateCluster | null = null
  if (high.length > 0) {
    const { lat, lon } = CLUSTER_AREA
    const inside = high.filter((r) => r.lat >= lat[0] && r.lat <= lat[1] && r.lon >= lon[0] && r.lon <= lon[1]).length
    const range = (vs: number[]): [number, number] => [Math.min(...vs), Math.max(...vs)]
    highRate = {
      threshold: HIGH_RATE,
      count: high.length,
      inside,
      latRange: range(high.map((r) => r.lat)),
      lonRange: range(high.map((r) => r.lon)),
      words: inside / high.length >= CLUSTER_AREA.minShare ? CLUSTER_AREA.words : undefined,
    }
  }
  return { instruments, highRate }
}
