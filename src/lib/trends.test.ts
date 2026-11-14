// Trend rules, sleep/mood guidance and the demo mission (SPEC.md sections 3 and 4).
import { describe, expect, it } from 'vitest'
import { GUIDANCE, INDICATORS, SELF_CARE_RED, guidanceFor, readIndicator } from '../content/indicators'
import type { Entry } from '../types'
import { demoMission } from './demo'
import { trendAlerts } from './trends'

const day = (missionDay: number, values: Partial<Entry>): Entry => ({
  missionDay,
  date: `2026-11-${String(missionDay).padStart(2, '0')}`,
  simulated: false,
  ...values,
})
const three = (values: Partial<Entry>, start = 1) => [0, 1, 2].map((i) => day(start + i, values))
const kinds = (entries: Entry[]) => trendAlerts(entries).map((a) => `${a.kind}:${a.indicatorId}`)

describe('trend rules', () => {
  it('red on 3 consecutive days escalates', () => {
    expect(kinds(three({ temperatureC: 38.2 }))).toEqual(['escalation:temperature'])
  })
  it('sleep < 6 h on 3 days gives the sleep-debt alert, not a generic escalation', () => {
    expect(kinds(three({ sleepHours: 5.5 }))).toEqual(['sleepDebt:sleep'])
    expect(kinds(three({ sleepHours: 6.0 }))).toEqual([])
  })
  it('mood <= 2 on 3 days gives the behavioral-health alert', () => {
    expect(kinds(three({ mood: 2 }))).toEqual(['behavioralHealth:mood'])
    expect(kinds(three({ mood: 3 }))).toEqual([])
  })
  it('blood pressure or heart rate yellow or worse on 3 days gives the cardiovascular alert', () => {
    expect(kinds(three({ heartRate: 105 }))).toEqual(['cardiovascular:heartRate'])
    expect(kinds(three({ systolic: 135, diastolic: 75 }))).toEqual(['cardiovascular:bloodPressure'])
    const mixed = [day(1, { heartRate: 105 }), day(2, { heartRate: 130 }), day(3, { heartRate: 105 })]
    expect(kinds(mixed)).toEqual(['cardiovascular:heartRate'])
  })
  it('red blood pressure on 3 days escalates without a duplicate cardiovascular alert', () => {
    expect(kinds(three({ systolic: 145, diastolic: 95 }))).toEqual(['escalation:bloodPressure'])
  })
  it('needs 3 entries on consecutive days, with the indicator logged in all 3', () => {
    expect(kinds(three({ sleepHours: 5 }).slice(0, 2))).toEqual([])
    expect(kinds([day(1, { sleepHours: 5 }), day(2, { sleepHours: 5 }), day(4, { sleepHours: 5 })])).toEqual([])
    expect(kinds([day(1, { sleepHours: 5 }), day(2, {}), day(3, { sleepHours: 5 })])).toEqual([])
  })
  it('only the last 3 entries count', () => {
    expect(kinds([...three({ mood: 1 }), day(4, { mood: 4 })])).toEqual([])
  })
})

describe('guidance for a single red reading', () => {
  const read = (values: Partial<Entry>) => INDICATORS.flatMap((i) => readIndicator(i.id, day(1, values)) ?? [])
  it('sleep or mood red alone: self-care text, no re-measure or Crew Medical Officer', () => {
    expect(guidanceFor(read({ sleepHours: 4 }))).toBe(SELF_CARE_RED)
    expect(guidanceFor(read({ mood: 1, heartRate: 105 }))).toBe(SELF_CARE_RED)
    expect(SELF_CARE_RED).not.toMatch(/re-measure|Crew Medical Officer/i)
  })
  it('any other red keeps the red guidance', () => {
    expect(guidanceFor(read({ temperatureC: 38.5, sleepHours: 4 }))).toBe(GUIDANCE.red)
  })
})

describe('demo mission', () => {
  const { missionStart, entries } = demoMission('2026-11-14')
  it('has 30 simulated days ending today', () => {
    expect(entries).toHaveLength(30)
    expect(missionStart).toBe('2026-10-16')
    expect(entries.at(-1)?.date).toBe('2026-11-14')
    expect(entries.every((e) => e.simulated)).toBe(true)
  })
  it('last day shows all three status colours', () => {
    const statuses = INDICATORS.map((i) => readIndicator(i.id, entries.at(-1)!)?.status)
    expect(new Set(statuses)).toEqual(new Set(['green', 'yellow', 'red']))
  })
  it('ends with a sleep-debt and a cardiovascular trend alert', () => {
    expect(kinds(entries)).toEqual(['cardiovascular:heartRate', 'sleepDebt:sleep'])
  })
  it('every other day is green except the planned anomalies', () => {
    const offDays = entries.filter((e) =>
      INDICATORS.some((i) => readIndicator(i.id, e)?.status !== 'green'),
    ).map((e) => e.missionDay)
    expect(offDays).toEqual([6, 7, 12, 17, 18, 22, 26, 28, 29, 30])
  })
})
