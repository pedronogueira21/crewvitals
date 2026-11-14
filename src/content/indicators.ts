// Indicators, thresholds, guidance and self-care text (SPEC.md section 4).
// This is the one place to edit them.
//
// Thresholds and guidance were reviewed by the team's biomedical engineer on
// 14 Nov 2026. Changes to this file need the same review.
//
// The thresholds are terrestrial adult clinical reference ranges. They are not
// NASA flight rules and must not be presented as such.

import type { Entry, Settings } from '../types'

export type Status = 'green' | 'yellow' | 'red'

export const REFERENCE_RANGE_LABEL = 'Reference range: adult clinical reference, Earth-based'

export const GUIDANCE: Record<Status, string> = {
  green: 'Within reference range. Keep your routine.',
  yellow:
    'Outside the reference range. Re-measure, review the self-care steps below, and log again tomorrow.',
  red: 'Well outside the reference range. Re-measure now. If confirmed, inform the Crew Medical Officer and report to the flight surgeon on the ground.',
}

export const URGENT_GUIDANCE = 'Urgent: inform the Crew Medical Officer now.'

/**
 * Sleep and mood: a single yellow or red reading gets this text instead of
 * GUIDANCE (no "re-measure", no Crew Medical Officer). They escalate only
 * through the 3-day trend rules below.
 */
export const SELF_CARE_GUIDANCE: Record<'yellow' | 'red', string> = {
  yellow: 'Below the reference range. Review the self-care steps and log again tomorrow.',
  red: 'Well below the reference range. Follow the self-care steps and log again tomorrow.',
}

/** Indicators that escalate only through the trend rules. */
export const TREND_ONLY_ESCALATION: IndicatorId[] = ['sleep', 'mood']

export type MissionSetting = Settings['setting']

/** SPEC section 5: on Mars transit, every red escalation text adds this line. */
export const MARS_TRANSIT_NOTE = 'Communication with the ground is delayed. Follow the onboard procedure first.'

/** A red escalation text for the mission setting. ISS and Lunar surface leave it unchanged. */
export function forSetting(text: string, setting: MissionSetting): string {
  return setting === 'Mars transit' ? `${text} ${MARS_TRANSIT_NOTE}` : text
}

/** Overall status box, when at least one red trend alert is active. */
export const RED_TREND_OVERALL = (count: number, setting: MissionSetting) =>
  `${count === 1 ? 'A red trend alert is' : `${count} red trend alerts are`} active: ${forSetting('inform the Crew Medical Officer and report to the flight surgeon on the ground.', setting)} See the trend alerts below.`

// Trend alerts (SPEC.md section 4, evaluated on the last 3 entries).
const ESCALATE = 'Inform the Crew Medical Officer and report to the flight surgeon on the ground.'

export const TREND_TEXT = {
  escalation: (name: string) => ({
    title: `${name}: red on 3 consecutive days`,
    action: ESCALATE,
  }),
  sleepDebt: {
    title: 'Sleep debt: under 6 h of sleep on 3 consecutive days',
    action: ESCALATE,
  },
  behavioralHealth: {
    title: 'Behavioral health: mood 2 or lower on 3 consecutive days',
    action: ESCALATE,
  },
  cardiovascular: (name: string) => ({
    title: `Cardiovascular trend: ${name.toLowerCase()} outside the reference range on 3 consecutive days`,
    action: 'Keep measuring every day and tell the Crew Medical Officer about the trend.',
  }),
}

// ---------------------------------------------------------------------------
// Measures: one number each, with its status zones.
//
// `zones` reads left to right along the number line. Each zone starts at
// `from` (inclusive) and runs until the next zone starts. A reading is rounded
// to `decimals` before it is looked up, so the numbers below are exactly the
// numbers in the spec table.
// ---------------------------------------------------------------------------

export type MeasureId =
  | 'systolic'
  | 'diastolic'
  | 'heartRate'
  | 'glucoseFasting'
  | 'glucoseNonFasting'
  | 'temperatureC'
  | 'sleepHours'
  | 'mood'

export type Zone = { from: number; status: Status }

export type Measure = {
  id: MeasureId
  label: string
  unit: string
  decimals: number
  zones: Zone[]
  /** Readings that trigger the urgent message on top of red. */
  urgent?: { atOrAbove?: number; below?: number }
  /** Highest possible value, for measures with a fixed top (mood). */
  ceiling?: number
  /** Ends of the gauge drawn on the dashboard. Display only, not a threshold. */
  gauge: { min: number; max: number }
  /** Values outside these limits are rejected by the form as typing mistakes. Not a threshold. */
  entryLimits: { min: number; max: number }
}

const LOWEST = Number.NEGATIVE_INFINITY

export const MEASURES: Record<MeasureId, Measure> = {
  // Blood pressure: green SBP 90–129 and DBP 60–79; yellow SBP 130–139 or
  // DBP 80–89; red SBP >= 140, DBP >= 90, SBP < 90, or DBP < 60.
  // The indicator takes the worse of the two measures.
  systolic: {
    id: 'systolic',
    label: 'Systolic',
    unit: 'mmHg',
    decimals: 0,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 90, status: 'green' },
      { from: 130, status: 'yellow' },
      { from: 140, status: 'red' },
    ],
    urgent: { atOrAbove: 180 },
    gauge: { min: 70, max: 200 },
    entryLimits: { min: 50, max: 260 },
  },
  diastolic: {
    id: 'diastolic',
    label: 'Diastolic',
    unit: 'mmHg',
    decimals: 0,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 60, status: 'green' },
      { from: 80, status: 'yellow' },
      { from: 90, status: 'red' },
    ],
    urgent: { atOrAbove: 120 },
    gauge: { min: 40, max: 130 },
    entryLimits: { min: 30, max: 160 },
  },
  // Resting heart rate: green 50–100; yellow 40–49 or 101–120; red < 40 or > 120.
  heartRate: {
    id: 'heartRate',
    label: 'Resting heart rate',
    unit: 'bpm',
    decimals: 0,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 40, status: 'yellow' },
      { from: 50, status: 'green' },
      { from: 101, status: 'yellow' },
      { from: 121, status: 'red' },
    ],
    gauge: { min: 30, max: 140 },
    entryLimits: { min: 20, max: 250 },
  },
  // Fasting glucose: green 70–99; yellow 54–69 or 100–125; red < 54 or >= 126.
  glucoseFasting: {
    id: 'glucoseFasting',
    label: 'Blood glucose (fasting)',
    unit: 'mg/dL',
    decimals: 0,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 54, status: 'yellow' },
      { from: 70, status: 'green' },
      { from: 100, status: 'yellow' },
      { from: 126, status: 'red' },
    ],
    urgent: { below: 54 },
    gauge: { min: 40, max: 220 },
    entryLimits: { min: 20, max: 600 },
  },
  // Non-fasting glucose: green 70–139; yellow 54–69 or 140–199; red < 54 or >= 200.
  glucoseNonFasting: {
    id: 'glucoseNonFasting',
    label: 'Blood glucose (non-fasting)',
    unit: 'mg/dL',
    decimals: 0,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 54, status: 'yellow' },
      { from: 70, status: 'green' },
      { from: 140, status: 'yellow' },
      { from: 200, status: 'red' },
    ],
    urgent: { below: 54 },
    gauge: { min: 40, max: 220 },
    entryLimits: { min: 20, max: 600 },
  },
  // Body temperature: green 36.0–37.5; yellow 35.0–35.9 or 37.6–37.9;
  // red < 35.0 or >= 38.0.
  temperatureC: {
    id: 'temperatureC',
    label: 'Body temperature',
    unit: '°C',
    decimals: 1,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 35.0, status: 'yellow' },
      { from: 36.0, status: 'green' },
      { from: 37.6, status: 'yellow' },
      { from: 38.0, status: 'red' },
    ],
    urgent: { atOrAbove: 39.0 },
    gauge: { min: 34, max: 40 },
    entryLimits: { min: 30, max: 43 },
  },
  // Sleep in the last 24 h: green >= 7.0; yellow 6.0–6.9; red < 6.0.
  sleepHours: {
    id: 'sleepHours',
    label: 'Sleep',
    unit: 'h',
    decimals: 1,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 6.0, status: 'yellow' },
      { from: 7.0, status: 'green' },
    ],
    gauge: { min: 3, max: 10 },
    entryLimits: { min: 0, max: 24 },
  },
  // Mood, 1 (very low) to 5 (very good): green 4–5; yellow 3; red 1–2.
  mood: {
    id: 'mood',
    label: 'Mood',
    unit: 'of 5',
    decimals: 0,
    zones: [
      { from: LOWEST, status: 'red' },
      { from: 3, status: 'yellow' },
      { from: 4, status: 'green' },
    ],
    ceiling: 5,
    gauge: { min: 0.5, max: 5.5 },
    entryLimits: { min: 1, max: 5 },
  },
}

export const MOOD_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Very good',
}

// ---------------------------------------------------------------------------
// Indicators: the six things shown on the dashboard and the check-in form.
// The ids match the indicator ids used in evidence.json.
//
// `howToMeasure` and `selfCare` are general wellness text, not NASA statements.
// They were drafted with Claude and reviewed by the team's biomedical engineer.
// ---------------------------------------------------------------------------

export type IndicatorId =
  | 'bloodPressure'
  | 'heartRate'
  | 'glucose'
  | 'temperature'
  | 'sleep'
  | 'mood'

export type Indicator = {
  id: IndicatorId
  name: string
  howToMeasure: string
  /** Steps for any reading outside the green range. */
  selfCare: string[]
  /** Extra steps shown first, only for a reading below the green range. */
  selfCareLow?: string[]
  /** Extra steps shown first, only for a reading above the green range. */
  selfCareHigh?: string[]
}

export const INDICATORS: Indicator[] = [
  {
    id: 'bloodPressure',
    name: 'Blood pressure',
    howToMeasure:
      'Rest for 5 minutes first. Put the cuff on your bare upper arm at heart level, then stay still and do not talk while it measures.',
    selfCare: [
      'Rest quietly for 5 minutes and measure again.',
      'Check that the cuff is the right size and sits on bare skin at heart level.',
      'Note any headache, dizziness, chest pain or changes in vision, and report them.',
    ],
  },
  {
    id: 'heartRate',
    name: 'Resting heart rate',
    howToMeasure:
      'Measure after at least 5 minutes of rest, not straight after exercise. Use your monitor, or count your pulse at the wrist for 30 seconds and double it.',
    selfCare: [
      'Rest for 10 minutes and measure again.',
      'Drink water.',
      'Note whether you exercised recently, had caffeine, or feel unwell.',
    ],
  },
  {
    id: 'glucose',
    name: 'Blood glucose',
    howToMeasure:
      'Clean and dry your fingertip, then use the glucose meter. Mark the reading as fasting if you have had nothing but water for at least 8 hours.',
    selfCare: [
      'If the reading seems unexpected, wash and dry your hands before repeating the test.',
      'Note what you last ate and when.',
    ],
    selfCareLow: [
      'Eat or drink a fast-acting carbohydrate, such as 15 g of glucose tablets or half a cup of fruit juice, then test again after 15 minutes.',
    ],
    selfCareHigh: [
      'Drink water, and avoid sugary food and drinks until you test again.',
      'Check that you chose fasting or not fasting correctly. The reference range depends on it.',
      'Note any unusual thirst, frequent urination or tiredness, and report it.',
    ],
  },
  {
    id: 'temperature',
    name: 'Body temperature',
    howToMeasure:
      'Use the same thermometer and the same body site each day. Wait 15 minutes after eating, drinking or exercise.',
    selfCare: [
      'Measure again after 15 minutes.',
      'Drink fluids and rest.',
      'Note any other symptoms, such as chills, cough or aches.',
    ],
  },
  {
    id: 'sleep',
    name: 'Sleep',
    howToMeasure:
      'Add up all the sleep you got in the last 24 hours, naps included. Round to the nearest half hour.',
    selfCare: [
      'Keep to your scheduled sleep and wake times.',
      'Dim the lights and avoid screens in the hour before sleep.',
      'Avoid caffeine in the 6 hours before sleep.',
    ],
  },
  {
    id: 'mood',
    name: 'Mood',
    howToMeasure:
      'Rate how you have felt overall today, from 1 (very low) to 5 (very good). Go with your first answer.',
    selfCare: [
      'Talk with a crewmate or someone you trust.',
      'Keep to your exercise, meal and sleep routine.',
      'Make time today for something you enjoy.',
    ],
  },
]

// ---------------------------------------------------------------------------
// Status rules
// ---------------------------------------------------------------------------

const SEVERITY: Record<Status, number> = { green: 0, yellow: 1, red: 2 }

export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), 'green')
}

/**
 * Guidance for one or more readings, from the worst status among them.
 * When that worst status comes only from sleep or mood, the self-care text is
 * used instead of "re-measure".
 */
export function guidanceFor(readings: Reading[], setting: MissionSetting): string {
  const status = worstStatus(readings.map((r) => r.status))
  if (status === 'green') return GUIDANCE.green
  const selfCareOnly = readings
    .filter((r) => r.status === status)
    .every((r) => TREND_ONLY_ESCALATION.includes(r.indicatorId))
  if (selfCareOnly) return SELF_CARE_GUIDANCE[status]
  return status === 'red' ? forSetting(GUIDANCE.red, setting) : GUIDANCE[status]
}

/** Whether a reading part is below or above its green range, or inside it. */
export function directionOf(part: ReadingPart): 'low' | 'high' | null {
  const { low, high } = greenRange(part.measure)
  if (part.value < low) return 'low'
  if (high !== undefined && part.value > high) return 'high'
  return null
}

/** Self-care steps for a reading: direction-specific steps first, then the general ones. */
export function selfCareSteps(indicator: Indicator, reading: Reading): string[] {
  const directions = new Set(reading.parts.map(directionOf))
  return [
    ...(directions.has('low') ? (indicator.selfCareLow ?? []) : []),
    ...(directions.has('high') ? (indicator.selfCareHigh ?? []) : []),
    ...indicator.selfCare,
  ]
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function statusOf(measure: Measure, value: number): Status {
  const v = roundTo(value, measure.decimals)
  let status = measure.zones[0].status
  for (const zone of measure.zones) {
    if (v >= zone.from) status = zone.status
  }
  return status
}

export function isUrgent(measure: Measure, value: number): boolean {
  const v = roundTo(value, measure.decimals)
  const { atOrAbove, below } = measure.urgent ?? {}
  return (atOrAbove !== undefined && v >= atOrAbove) || (below !== undefined && v < below)
}

/** The green zone of a measure, as its inclusive lowest and highest values. */
export function greenRange(measure: Measure): { low: number; high?: number } {
  const i = measure.zones.findIndex((z) => z.status === 'green')
  const next = measure.zones[i + 1]
  const step = 10 ** -measure.decimals
  return {
    low: measure.zones[i].from,
    high: next ? roundTo(next.from - step, measure.decimals) : measure.ceiling,
  }
}

export function greenRangeText(measure: Measure): string {
  const { low, high } = greenRange(measure)
  const f = (n: number) => n.toFixed(measure.decimals)
  return high === undefined ? `≥ ${f(low)}` : `${f(low)}–${f(high)}`
}

export type ReadingPart = {
  measure: Measure
  value: number
  status: Status
  urgent: boolean
}

export type Reading = {
  indicatorId: IndicatorId
  status: Status
  urgent: boolean
  /** The value as shown on the card, without the unit. */
  valueText: string
  unit: string
  /** Extra context shown after the value, such as "fasting". */
  note?: string
  /** The green range for this reading, with unit. */
  referenceText: string
  parts: ReadingPart[]
}

function part(id: MeasureId, value: number): ReadingPart {
  const measure = MEASURES[id]
  return {
    measure,
    value: roundTo(value, measure.decimals),
    status: statusOf(measure, value),
    urgent: isUrgent(measure, value),
  }
}

function reading(
  indicatorId: IndicatorId,
  parts: ReadingPart[],
  text: { valueText: string; unit: string; note?: string; referenceText: string },
): Reading {
  return {
    indicatorId,
    status: worstStatus(parts.map((p) => p.status)),
    urgent: parts.some((p) => p.urgent),
    parts,
    ...text,
  }
}

/** The status of one indicator in one entry, or null if it was not logged. */
export function readIndicator(id: IndicatorId, entry: Entry): Reading | null {
  switch (id) {
    case 'bloodPressure': {
      if (entry.systolic === undefined || entry.diastolic === undefined) return null
      const sys = part('systolic', entry.systolic)
      const dia = part('diastolic', entry.diastolic)
      return reading(id, [sys, dia], {
        valueText: `${sys.value}/${dia.value}`,
        unit: 'mmHg',
        referenceText: `${greenRangeText(sys.measure)} / ${greenRangeText(dia.measure)} mmHg`,
      })
    }
    case 'heartRate': {
      if (entry.heartRate === undefined) return null
      const p = part('heartRate', entry.heartRate)
      return reading(id, [p], {
        valueText: String(p.value),
        unit: 'bpm',
        referenceText: `${greenRangeText(p.measure)} bpm`,
      })
    }
    case 'glucose': {
      if (entry.glucose === undefined) return null
      // The form always records fasting or non-fasting. If the flag is missing,
      // the stricter fasting range is used.
      const fasting = entry.glucoseFasting !== false
      const p = part(fasting ? 'glucoseFasting' : 'glucoseNonFasting', entry.glucose)
      const note = fasting ? 'fasting' : 'non-fasting'
      return reading(id, [p], {
        valueText: String(p.value),
        unit: 'mg/dL',
        note,
        referenceText: `${greenRangeText(p.measure)} mg/dL (${note})`,
      })
    }
    case 'temperature': {
      if (entry.temperatureC === undefined) return null
      const p = part('temperatureC', entry.temperatureC)
      return reading(id, [p], {
        valueText: p.value.toFixed(1),
        unit: '°C',
        referenceText: `${greenRangeText(p.measure)} °C`,
      })
    }
    case 'sleep': {
      if (entry.sleepHours === undefined) return null
      const p = part('sleepHours', entry.sleepHours)
      return reading(id, [p], {
        valueText: p.value.toFixed(1),
        unit: 'h',
        referenceText: `${greenRangeText(p.measure)} h in the last 24 h`,
      })
    }
    case 'mood': {
      if (entry.mood === undefined) return null
      const p = part('mood', entry.mood)
      return reading(id, [p], {
        valueText: String(p.value),
        unit: 'of 5',
        note: MOOD_LABELS[entry.mood],
        referenceText: `${greenRangeText(p.measure)} on a 1 to 5 self-report scale`,
      })
    }
  }
}
