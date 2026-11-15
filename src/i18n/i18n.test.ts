// Translation checks: every string exists in both languages, clinical numbers
// are unchanged, formats are Brazilian, and status rules give identical results
// whatever the language.
import { describe, expect, it } from 'vitest'
import { CLINICAL, INDICATOR_IDS, guidanceFor, guidanceKey, readIndicator, readingText, selfCareSteps } from '../content/indicators'
import type { MissionSetting } from '../content/indicators'
import { demoMission } from '../lib/demo'
import { trendAlertText, trendAlerts } from '../lib/trends'
import { LANGS, formatDate, formatUtc, num } from './format'
import { UI } from './ui'

/** Paths whose English value is intentionally empty (Portuguese adds a note there). */
const EMPTY_IN_ENGLISH = new Set(['nasaText.sourceSuffix'])

type Leaf = { path: string; value: unknown }
function leaves(obj: unknown, path = ''): Leaf[] {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  }
  return [{ path, value: obj }]
}

/** Sample arguments for dictionary functions: numbers for count-like names, short strings otherwise. */
const sample = (fn: (...args: never[]) => string) =>
  (fn as (...args: unknown[]) => string)(...Array.from({ length: fn.length }, (_, i) => (i % 2 ? 3 : 'X')))

function expectSameShape(en: unknown, pt: unknown) {
  const a = leaves(en)
  const b = new Map(leaves(pt).map((l) => [l.path, l.value]))
  expect([...b.keys()].sort()).toEqual(a.map((l) => l.path).sort())
  for (const { path, value } of a) {
    const other = b.get(path)
    expect(typeof other, path).toBe(typeof value)
    if (typeof value === 'string') {
      if (!EMPTY_IN_ENGLISH.has(path)) expect(value.trim(), `en ${path}`).not.toBe('')
      expect((other as string).trim(), `pt ${path}`).not.toBe('')
    } else if (typeof value === 'function') {
      expect((other as () => string).length, `arity ${path}`).toBe((value as () => string).length)
      expect(sample(value as () => string).trim(), `en ${path}()`).not.toBe('')
      expect(sample(other as () => string).trim(), `pt ${path}()`).not.toBe('')
    } else if (Array.isArray(value)) {
      expect((other as unknown[]).length, `length ${path}`).toBe(value.length)
      for (const [i, s] of (other as string[]).entries()) expect(s.trim(), `pt ${path}[${i}]`).not.toBe('')
    }
  }
}

describe('every string exists in both languages', () => {
  it('screen text (src/i18n/ui.ts)', () => expectSameShape(UI.en, UI['pt-BR']))
  it('clinical text (src/content/indicators.ts)', () => expectSameShape(CLINICAL.en, CLINICAL['pt-BR']))
  it('self-care lists have the same number of steps in both languages', () => {
    for (const id of INDICATOR_IDS) {
      for (const key of ['selfCare', 'selfCareLow', 'selfCareHigh'] as const) {
        expect(CLINICAL['pt-BR'].indicators[id][key]?.length, `${id}.${key}`).toBe(CLINICAL.en.indicators[id][key]?.length)
      }
    }
  })
})

describe('clinical numbers are unchanged in Portuguese', () => {
  // Every number in an English clinical string must appear in its Portuguese
  // version (with a decimal comma), and no other number may be added.
  const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')).sort()
  it('in every clinical string', () => {
    const en = leaves(CLINICAL.en).filter((l) => typeof l.value === 'string' || Array.isArray(l.value))
    const pt = new Map(leaves(CLINICAL['pt-BR']).map((l) => [l.path, l.value]))
    for (const { path, value } of en) {
      const a = ([] as string[]).concat(value as string | string[])
      const b = ([] as string[]).concat(pt.get(path) as string | string[])
      a.forEach((s, i) => expect(numbers(b[i]), `${path}[${i}]`).toEqual(numbers(s)))
    }
  })
})

describe('Brazilian formats', () => {
  it('numbers use a decimal comma and a thousands point', () => {
    expect(num(36.7, 'pt-BR', 1)).toBe('36,7')
    expect(num(8745, 'pt-BR')).toBe('8.745')
    expect(num(36.7, 'en', 1)).toBe('36.7')
    expect(num(8745, 'en')).toBe('8,745')
  })
  it('dates are DD/MM/YYYY, times 24-hour UTC', () => {
    expect(formatDate('2026-11-14', 'pt-BR')).toBe('14/11/2026')
    expect(formatDate('2026-11-14', 'en')).toBe('14 Nov 2026')
    expect(formatUtc('2026-11-11T21:21Z', 'pt-BR')).toBe('11/11/2026, 21:21 UTC')
  })
  it('a reading is shown with the Portuguese decimal comma', () => {
    const r = readIndicator('temperature', { missionDay: 1, date: '2026-11-14', temperatureC: 36.7, simulated: false })!
    expect(readingText(r, 'pt-BR').valueText).toBe('36,7')
    expect(readingText(r, 'en').valueText).toBe('36.7')
  })
})

describe('status rules give identical results in both languages', () => {
  const { entries } = demoMission('2026-11-14')
  const settings: MissionSetting[] = ['ISS', 'Lunar surface', 'Mars transit']

  /** Everything a language could influence, reduced to language-free facts. */
  function outcome(lang: (typeof LANGS)[number], setting: MissionSetting) {
    const c = CLINICAL[lang]
    return entries.map((e, day) => {
      const readings = INDICATOR_IDS.flatMap((id) => readIndicator(id, e) ?? [])
      const text = guidanceFor(readings, setting, lang)
      const key = guidanceKey(readings)
      // The text shown must be exactly the text for the language-free key.
      const expected =
        key === 'selfCareYellow' ? c.selfCareGuidance.yellow
        : key === 'selfCareRed' ? c.selfCareGuidance.red
        : key === 'red' && setting === 'Mars transit' ? `${c.guidance.red} ${c.marsNote}`
        : c.guidance[key]
      expect(text, `${lang} day ${day + 1}`).toBe(expected)
      const alerts = trendAlerts(entries.slice(0, day + 1))
      for (const a of alerts) expect(trendAlertText(a, setting, lang).title).not.toBe('')
      return {
        statuses: readings.map((r) => [r.indicatorId, r.status, r.urgent]),
        key,
        steps: readings.map((r) => selfCareSteps(r, lang).length),
        alerts: alerts.map((a) => [a.kind, a.indicatorId, a.status]),
      }
    })
  }

  for (const setting of settings) {
    it(`over every demo day, ${setting}`, () => {
      expect(outcome('pt-BR', setting)).toEqual(outcome('en', setting))
    })
  }
})
