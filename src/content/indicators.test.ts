// Checks the status rules against the table in SPEC.md section 4, at every boundary.
import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import { MEASURES, greenRangeText, isUrgent, readIndicator, statusOf } from './indicators'
import type { MeasureId, Status } from './indicators'

const base: Entry = { missionDay: 1, date: '2026-11-14', simulated: false }

function expectZones(id: MeasureId, cases: [number, Status][]) {
  for (const [value, status] of cases) {
    expect(statusOf(MEASURES[id], value), `${id} ${value}`).toBe(status)
  }
}

describe('single measures', () => {
  it('systolic', () => {
    expectZones('systolic', [
      [89, 'red'], [90, 'green'], [129, 'green'], [130, 'yellow'], [139, 'yellow'], [140, 'red'], [180, 'red'],
    ])
  })
  it('diastolic', () => {
    expectZones('diastolic', [
      [59, 'red'], [60, 'green'], [79, 'green'], [80, 'yellow'], [89, 'yellow'], [90, 'red'], [120, 'red'],
    ])
  })
  it('resting heart rate', () => {
    expectZones('heartRate', [
      [39, 'red'], [40, 'yellow'], [49, 'yellow'], [50, 'green'], [100, 'green'],
      [101, 'yellow'], [120, 'yellow'], [121, 'red'],
    ])
  })
  it('fasting glucose', () => {
    expectZones('glucoseFasting', [
      [53, 'red'], [54, 'yellow'], [69, 'yellow'], [70, 'green'], [99, 'green'],
      [100, 'yellow'], [125, 'yellow'], [126, 'red'],
    ])
  })
  it('non-fasting glucose', () => {
    expectZones('glucoseNonFasting', [
      [53, 'red'], [54, 'yellow'], [69, 'yellow'], [70, 'green'], [139, 'green'],
      [140, 'yellow'], [199, 'yellow'], [200, 'red'],
    ])
  })
  it('body temperature', () => {
    expectZones('temperatureC', [
      [34.9, 'red'], [35.0, 'yellow'], [35.9, 'yellow'], [36.0, 'green'], [37.5, 'green'],
      [37.6, 'yellow'], [37.9, 'yellow'], [38.0, 'red'], [39.0, 'red'],
    ])
  })
  it('sleep', () => {
    expectZones('sleepHours', [[5.9, 'red'], [6.0, 'yellow'], [6.9, 'yellow'], [7.0, 'green'], [9, 'green']])
  })
  it('mood', () => {
    expectZones('mood', [[1, 'red'], [2, 'red'], [3, 'yellow'], [4, 'green'], [5, 'green']])
  })
  it('rounds to the precision of the measure before looking up the zone', () => {
    expectZones('temperatureC', [[37.54, 'green'], [37.96, 'red']])
    expectZones('sleepHours', [[6.96, 'green']])
  })
})

describe('blood pressure takes the worse of systolic and diastolic', () => {
  const bp = (systolic: number, diastolic: number) =>
    readIndicator('bloodPressure', { ...base, systolic, diastolic })
  it('green needs both in range', () => {
    expect(bp(118, 76)?.status).toBe('green')
    expect(bp(129, 79)?.status).toBe('green')
  })
  it('yellow if either is yellow', () => {
    expect(bp(135, 70)?.status).toBe('yellow')
    expect(bp(120, 85)?.status).toBe('yellow')
  })
  it('red if either is red', () => {
    expect(bp(120, 95)?.status).toBe('red')
    expect(bp(145, 70)?.status).toBe('red')
    expect(bp(85, 70)?.status).toBe('red')
    expect(bp(110, 55)?.status).toBe('red')
    expect(bp(135, 95)?.status).toBe('red')
  })
  it('is not logged unless both numbers are present', () => {
    expect(readIndicator('bloodPressure', { ...base, systolic: 120 })).toBeNull()
  })
})

describe('urgent rules', () => {
  it('systolic >= 180 or diastolic >= 120', () => {
    expect(isUrgent(MEASURES.systolic, 179)).toBe(false)
    expect(isUrgent(MEASURES.systolic, 180)).toBe(true)
    expect(isUrgent(MEASURES.diastolic, 119)).toBe(false)
    expect(isUrgent(MEASURES.diastolic, 120)).toBe(true)
    expect(readIndicator('bloodPressure', { ...base, systolic: 150, diastolic: 120 })?.urgent).toBe(true)
  })
  it('glucose < 54, fasting or not', () => {
    expect(readIndicator('glucose', { ...base, glucose: 53, glucoseFasting: true })?.urgent).toBe(true)
    expect(readIndicator('glucose', { ...base, glucose: 53, glucoseFasting: false })?.urgent).toBe(true)
    expect(readIndicator('glucose', { ...base, glucose: 54, glucoseFasting: true })?.urgent).toBe(false)
    expect(readIndicator('glucose', { ...base, glucose: 300, glucoseFasting: false })?.urgent).toBe(false)
  })
  it('temperature >= 39.0', () => {
    expect(isUrgent(MEASURES.temperatureC, 38.9)).toBe(false)
    expect(isUrgent(MEASURES.temperatureC, 39.0)).toBe(true)
  })
  it('no urgent rule for heart rate, sleep or mood', () => {
    expect(isUrgent(MEASURES.heartRate, 200)).toBe(false)
    expect(isUrgent(MEASURES.sleepHours, 0)).toBe(false)
    expect(isUrgent(MEASURES.mood, 1)).toBe(false)
  })
})

describe('glucose uses the range that matches the fasting flag', () => {
  it('110 is yellow fasting and green non-fasting', () => {
    expect(readIndicator('glucose', { ...base, glucose: 110, glucoseFasting: true })?.status).toBe('yellow')
    expect(readIndicator('glucose', { ...base, glucose: 110, glucoseFasting: false })?.status).toBe('green')
  })
})

describe('green range text shown in the UI', () => {
  it('matches the spec table', () => {
    expect(greenRangeText(MEASURES.systolic)).toBe('90–129')
    expect(greenRangeText(MEASURES.diastolic)).toBe('60–79')
    expect(greenRangeText(MEASURES.heartRate)).toBe('50–100')
    expect(greenRangeText(MEASURES.glucoseFasting)).toBe('70–99')
    expect(greenRangeText(MEASURES.glucoseNonFasting)).toBe('70–139')
    expect(greenRangeText(MEASURES.temperatureC)).toBe('36.0–37.5')
    expect(greenRangeText(MEASURES.sleepHours)).toBe('≥ 7.0')
    expect(greenRangeText(MEASURES.mood)).toBe('4–5')
  })
})
