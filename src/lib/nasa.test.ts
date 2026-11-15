// NASA data code (SPEC section 6) on the real snapshots, and the Pages
// Functions with the upstream API working and failing.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestGet as radiationFn } from '../../functions/api/radiation'
import { onRequestGet as spaceWeatherFn } from '../../functions/api/space-weather'
import { onRequestGet as studiesFn } from '../../functions/api/studies'
import type { Context } from '../../functions/_lib/serve'
import {
  DONKI_SNAPSHOT_WINDOW,
  STUDY_KEYWORDS,
  RADIATION_ENVIRONMENTS,
  RADLAB_DAY,
  integrateWindow,
  osdrSnapshot,
  parseStudies,
  radlabSnapshot,
  summarizeEnvironment,
  summarizeSpaceWeather,
} from './nasa'
import type { EnvironmentId } from './nasa'

const files = import.meta.glob('../../public/snapshots/*.json', { eager: true, import: 'default' })
const snapshot = (path: string): unknown => {
  if (!(`../../public${path}` in files)) throw new Error(`No snapshot ${path}`)
  return files[`../../public${path}`]
}

describe('DONKI', () => {
  const flr = snapshot('/snapshots/donki-flr.json')
  it('snapshot week: no SEP and no X flare, so no alert; latest flare is M1.7 on 11 Nov', () => {
    const sw = summarizeSpaceWeather(flr, [], DONKI_SNAPSHOT_WINDOW)
    expect(sw.alerts).toEqual([])
    expect(sw.flareCount).toBe(7)
    expect(sw.latestFlare).toMatchObject({ classType: 'M1.7', time: '2026-11-11T21:21Z' })
  })
  it('an SEP event or an X flare raises the alert, newest first', () => {
    const sw = summarizeSpaceWeather(
      [{ classType: 'X1.1', peakTime: '2026-11-09T10:00Z', link: 'f' }, { classType: 'M5.0', peakTime: '2026-11-10T10:00Z' }],
      [{ eventTime: '2026-11-12T01:00Z', link: 's' }],
      DONKI_SNAPSHOT_WINDOW,
    )
    expect(sw.alerts.map((a) => a.kind)).toEqual(['sep', 'flare'])
    expect(sw.latestFlare?.classType).toBe('M5.0')
  })
  it('rejects a non-array response', () => {
    expect(() => summarizeSpaceWeather({ error: 'x' }, [], DONKI_SNAPSHOT_WINDOW)).toThrow()
  })
})

describe('OSDR', () => {
  it('every keyword has a snapshot with at least 5 hits', () => {
    for (const term of STUDY_KEYWORDS) {
      const s = parseStudies(snapshot(osdrSnapshot(term)), term)
      expect(s.total, term).toBeGreaterThanOrEqual(5)
      expect(s.studies.length, term).toBe(5)
      for (const study of s.studies) {
        expect(study.url).toBe(`https://osdr.nasa.gov/bio/repo/data/studies/${study.accession}`)
        expect(study.organism && study.projectType).toBeTruthy()
      }
    }
  })
})

describe('RadLab', () => {
  const h = 3_600_000
  it('integrates over the window by the trapezoid rule, cutting segments at the edges', () => {
    // 10 µGy/h flat from -1 h to 1 h, then rising to 30 µGy/h at 3 h. Window [0, 2 h].
    const readings = [{ t: -h, rate: 10 }, { t: h, rate: 10 }, { t: 3 * h, rate: 30 }]
    expect(integrateWindow(readings, 0, 2 * h)).toEqual({ dose: 10 + 15, hours: 2, longestGap: 2 })
  })

  // Expected daily doses from an independent Python check (10 s sampling of the
  // same straight-line curve) on the snapshots, 2026-11-14.
  const expected: Record<EnvironmentId, number> = {
    iss: 268.9,
    'lunar-orbit': 209.7,
    'cislunar-orion': 404.1,
    'deep-space': 270.4,
    'mars-orbit': 270.6,
    'mars-surface': 163.4,
  }
  for (const env of RADIATION_ENVIRONMENTS) {
    it(`${env.name}: full day on ${RADLAB_DAY}, dose matches the independent check`, () => {
      const d = summarizeEnvironment(snapshot(radlabSnapshot(env.id)), env.id)
      expect(d.hoursCovered).toBeCloseTo(24, 5)
      expect(d.dailyDose).toBeCloseTo(expected[env.id], 0)
      expect(d.radlab.spacecraft && d.radlab.trajectory).toBeTruthy()
      expect(d.series.length).toBeLessThanOrEqual(300)
      expect(d.median).toBeLessThanOrEqual(d.max)
    })
  }

  it('records the RadLab metadata as given', () => {
    expect(summarizeEnvironment(snapshot(radlabSnapshot('deep-space')), 'deep-space').radlab).toEqual({
      spacecraft: 'BioSentinel',
      instrument: 'BPD',
      instrumentFamily: 'Timepix',
      trajectory: 'Heliocentric orbit at 1 AU',
    })
  })

  it('ISS: high readings cluster and are named in plain words; other environments have no positions', () => {
    const iss = summarizeEnvironment(snapshot(radlabSnapshot('iss')), 'iss')
    expect(iss.highRate?.area).toBe('southAmericaSouthAtlantic')
    expect(iss.highRate!.inside / iss.highRate!.count).toBeGreaterThanOrEqual(0.9)
    expect(summarizeEnvironment(snapshot(radlabSnapshot('mars-orbit')), 'mars-orbit').highRate).toBeNull()
  })

  it('maps columns by name, not position, and ignores other instruments', () => {
    const d = summarizeEnvironment(
      {
        columns: ['absorbed_dose_rate', 'instrument_id', 'timestamp'],
        data: [
          [4, 'MSL-RAD-Surface', `${RADLAB_DAY}T00:00:00`],
          [999, 'Other', `${RADLAB_DAY}T06:00:00`],
          [4, 'MSL-RAD-Surface', `${RADLAB_DAY}T23:00:00`],
        ],
      },
      'mars-surface',
    )
    expect(d).toMatchObject({ readings: 2, mean: 4, max: 4 })
    expect(d.dailyDose).toBeCloseTo(4 * 23, 5)
  })
})

describe('Pages Functions', () => {
  afterEach(() => vi.unstubAllGlobals())

  const assets = {
    fetch: async (input: Request | URL | string) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      return Response.json(snapshot(path))
    },
  }
  const call = async (fn: (ctx: Context) => Response | Promise<Response>, url: string) => {
    const res = await fn({ request: new Request(url), env: { ASSETS: assets } })
    return { status: res.status, body: await res.json() }
  }
  const upstreamDown = () => vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }))
  const upstreamServes = (byHost: (url: string) => unknown) =>
    vi.stubGlobal('fetch', async (url: string) => Response.json(byHost(url)))

  it('fall back to the snapshot when upstream fails', async () => {
    upstreamDown()
    const sw = await call(spaceWeatherFn, 'https://x.dev/api/space-weather')
    expect(sw.body).toMatchObject({ mode: 'snapshot', retrieved: '2026-11-14', data: { window: DONKI_SNAPSHOT_WINDOW } })
    for (const env of RADIATION_ENVIRONMENTS) {
      const rad = await call(radiationFn, `https://x.dev/api/radiation?env=${env.id}`)
      expect(rad.body, env.id).toMatchObject({ mode: 'snapshot', data: { id: env.id, instrumentId: env.instrumentId } })
    }
    const st = await call(studiesFn, 'https://x.dev/api/studies?term=bone%20loss')
    expect(st.body).toMatchObject({ mode: 'snapshot', data: { term: 'bone loss' } })
  })

  it('return live data when upstream answers', async () => {
    upstreamServes((url) =>
      url.includes('DONKI') ? [] : url.includes('radlab') ? snapshot(radlabSnapshot('lunar-orbit')) : snapshot(osdrSnapshot('glucose')),
    )
    expect((await call(spaceWeatherFn, 'https://x.dev/api/space-weather')).body.mode).toBe('live')
    expect((await call(radiationFn, 'https://x.dev/api/radiation?env=lunar-orbit')).body.mode).toBe('live')
    expect((await call(studiesFn, 'https://x.dev/api/studies?term=glucose')).body.mode).toBe('live')
  })

  it('fall back when upstream answers with an unexpected shape', async () => {
    upstreamServes(() => ({ unexpected: true }))
    expect((await call(radiationFn, 'https://x.dev/api/radiation?env=iss')).body.mode).toBe('snapshot')
  })

  it('studies and radiation accept only their fixed lists', async () => {
    upstreamDown()
    expect((await call(studiesFn, 'https://x.dev/api/studies?term=anything')).status).toBe(400)
    expect((await call(radiationFn, 'https://x.dev/api/radiation?env=moon-surface')).status).toBe(400)
    expect((await call(radiationFn, 'https://x.dev/api/radiation')).status).toBe(400)
  })
})
