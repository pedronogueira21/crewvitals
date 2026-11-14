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
  integrateDose,
  osdrSnapshot,
  parseStudies,
  summarizeRadiation,
  summarizeSpaceWeather,
} from './nasa'

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
  it('integrates with the trapezoid rule and bridges gaps', () => {
    const h = 3_600_000
    // 10 µGy/h for 1 h, then a 2 h gap rising linearly to 30 µGy/h.
    expect(integrateDose([{ t: 0, rate: 10 }, { t: h, rate: 10 }, { t: 3 * h, rate: 30 }])).toEqual({
      dose: 10 + 40,
      hours: 3,
      longestGap: 2,
    })
  })

  const r = summarizeRadiation(snapshot('/snapshots/radlab-24h.json'))
  const byId = Object.fromEntries(r.instruments.map((i) => [i.id, i]))
  it('summarizes the measured day per instrument', () => {
    expect(Object.keys(byId)).toEqual(['DosTel1', 'DosTel2'])
    expect(byId.DosTel1.readings).toBe(1192)
    expect(byId.DosTel2.readings).toBe(1197)
    // Values recomputed independently in Python from the snapshot on 2026-11-14.
    expect(byId.DosTel1.dailyDose).toBeCloseTo(291.5, 0)
    expect(byId.DosTel2.dailyDose).toBeCloseTo(252.1, 0)
    expect(byId.DosTel1.longestGapMinutes).toBeCloseTo(17.6, 0)
    expect(byId.DosTel1.median).toBeLessThan(byId.DosTel1.mean / 4)
    expect(byId.DosTel1.max).toBeCloseTo(731.3, 0)
  })
  it('finds the high-rate cluster and names it in plain words', () => {
    expect(r.highRate).toMatchObject({ count: 180, inside: 180 })
    expect(r.highRate?.words).toMatch(/South America/)
  })
  it('does not name an area when high readings are spread out', () => {
    const spread = summarizeRadiation({
      columns: ['timestamp', 'instrument_id', 'absorbed_dose_rate', 'latitude', 'longitude'],
      data: [
        ['2022-04-01T00:00:00', 'A', 150, -30, -50],
        ['2022-04-01T00:01:00', 'A', 150, 50, 100],
      ],
    })
    expect(spread.highRate).toMatchObject({ count: 2, inside: 1, words: undefined })
  })
  it('maps columns by name, not position', () => {
    const swapped = summarizeRadiation({
      columns: ['longitude', 'latitude', 'absorbed_dose_rate', 'instrument_id', 'timestamp'],
      data: [
        [-50, -30, 4, 'A', '2022-04-01T00:00:00'],
        [-50, -30, 6, 'A', '2022-04-01T01:00:00'],
      ],
    })
    expect(swapped.instruments[0]).toMatchObject({ id: 'A', dailyDose: 5, mean: 5 })
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
    const rad = await call(radiationFn, 'https://x.dev/api/radiation')
    expect(rad.body.mode).toBe('snapshot')
    expect(rad.body.data.instruments).toHaveLength(2)
    const st = await call(studiesFn, 'https://x.dev/api/studies?term=bone%20loss')
    expect(st.body).toMatchObject({ mode: 'snapshot', data: { term: 'bone loss' } })
  })

  it('return live data when upstream answers', async () => {
    upstreamServes((url) =>
      url.includes('DONKI') ? [] : url.includes('radlab') ? snapshot('/snapshots/radlab-24h.json') : snapshot(osdrSnapshot('glucose')),
    )
    expect((await call(spaceWeatherFn, 'https://x.dev/api/space-weather')).body.mode).toBe('live')
    expect((await call(radiationFn, 'https://x.dev/api/radiation')).body.mode).toBe('live')
    expect((await call(studiesFn, 'https://x.dev/api/studies?term=glucose')).body.mode).toBe('live')
  })

  it('fall back when upstream answers with an unexpected shape', async () => {
    upstreamServes(() => ({ unexpected: true }))
    expect((await call(radiationFn, 'https://x.dev/api/radiation')).body.mode).toBe('snapshot')
  })

  it('studies accepts only the fixed keywords', async () => {
    upstreamDown()
    expect((await call(studiesFn, 'https://x.dev/api/studies?term=anything')).status).toBe(400)
  })
})
