// Indicators, thresholds, guidance and self-care text (SPEC.md section 4).
// This is the one place to edit them.
//
// Thresholds and guidance were reviewed by the team's biomedical engineer on
// 14 Nov 2026. Changes to this file need the same review.
//
// The thresholds are terrestrial adult clinical reference ranges. They are not
// NASA flight rules and must not be presented as such.
//
// Status rules never depend on the language. Only the text in CLINICAL does.

import { num } from '../i18n/format'
import type { Lang } from '../i18n/format'
import type { Entry, Settings } from '../types'

export type Status = 'green' | 'yellow' | 'red'
export type MissionSetting = Settings['setting']

export type IndicatorId = 'bloodPressure' | 'heartRate' | 'glucose' | 'temperature' | 'sleep' | 'mood'

/** The six indicators, in display order. The ids match evidence.json. */
export const INDICATOR_IDS: IndicatorId[] = ['bloodPressure', 'heartRate', 'glucose', 'temperature', 'sleep', 'mood']

/** Indicators that escalate only through the trend rules. */
export const TREND_ONLY_ESCALATION: IndicatorId[] = ['sleep', 'mood']

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

// ---------------------------------------------------------------------------
// Clinical text, per language
// ---------------------------------------------------------------------------

export type IndicatorText = {
  name: string
  howToMeasure: string
  /** Steps for any reading outside the green range. */
  selfCare: string[]
  /** Extra steps shown first, only for a reading below the green range. */
  selfCareLow?: string[]
  /** Extra steps shown first, only for a reading above the green range. */
  selfCareHigh?: string[]
}

export type ClinicalText = {
  referenceRangeLabel: string
  guidance: Record<Status, string>
  /** Sleep and mood: a single yellow or red reading gets this instead of guidance (no re-measure, no CMO). */
  selfCareGuidance: Record<'yellow' | 'red', string>
  urgent: string
  /** SPEC section 5: on Mars transit, every red escalation text adds this line. */
  marsNote: string
  /** Escalation sentence, as a sentence and as the end of the overall red-trend message. */
  escalate: string
  escalateInline: string
  redTrendOverall: (count: number, action: string) => string
  trend: {
    escalation: (name: string) => string
    sleepDebt: string
    behavioralHealth: string
    cardiovascular: (name: string) => string
    cardiovascularAction: string
  }
  indicators: Record<IndicatorId, IndicatorText>
  measures: Record<MeasureId, { label: string; unit: string }>
  moodLabels: Record<1 | 2 | 3 | 4 | 5, string>
  reading: {
    fasting: string
    nonFasting: string
    sleepReference: (range: string) => string
    moodReference: (range: string) => string
  }
}

const EN: ClinicalText = {
  referenceRangeLabel: 'Reference range: adult clinical reference, Earth-based',
  guidance: {
    green: 'Within reference range. Keep your routine.',
    yellow: 'Outside the reference range. Re-measure, review the self-care steps below, and log again tomorrow.',
    red: 'Well outside the reference range. Re-measure now. If confirmed, inform the Crew Medical Officer and report to the flight surgeon on the ground.',
  },
  selfCareGuidance: {
    yellow: 'Below the reference range. Review the self-care steps and log again tomorrow.',
    red: 'Well below the reference range. Follow the self-care steps and log again tomorrow.',
  },
  urgent: 'Urgent: inform the Crew Medical Officer now.',
  marsNote: 'Communication with the ground is delayed. Follow the onboard procedure first.',
  escalate: 'Inform the Crew Medical Officer and report to the flight surgeon on the ground.',
  escalateInline: 'inform the Crew Medical Officer and report to the flight surgeon on the ground.',
  redTrendOverall: (count, action) =>
    `${count === 1 ? 'A red trend alert is' : `${count} red trend alerts are`} active: ${action} See the trend alerts below.`,
  trend: {
    escalation: (name) => `${name}: red on 3 consecutive days`,
    sleepDebt: 'Sleep debt: under 6 h of sleep on 3 consecutive days',
    behavioralHealth: 'Behavioral health: mood 2 or lower on 3 consecutive days',
    cardiovascular: (name) => `Cardiovascular trend: ${name.toLowerCase()} outside the reference range on 3 consecutive days`,
    cardiovascularAction: 'Keep measuring every day and tell the Crew Medical Officer about the trend.',
  },
  indicators: {
    bloodPressure: {
      name: 'Blood pressure',
      howToMeasure:
        'Rest for 5 minutes first. Put the cuff on your bare upper arm at heart level, then stay still and do not talk while it measures.',
      selfCare: [
        'Rest quietly for 5 minutes and measure again.',
        'Check that the cuff is the right size and sits on bare skin at heart level.',
        'Note any headache, dizziness, chest pain or changes in vision, and report them.',
      ],
    },
    heartRate: {
      name: 'Resting heart rate',
      howToMeasure:
        'Measure after at least 5 minutes of rest, not straight after exercise. Use your monitor, or count your pulse at the wrist for 30 seconds and double it.',
      selfCare: [
        'Rest for 10 minutes and measure again.',
        'Drink water.',
        'Note whether you exercised recently, had caffeine, or feel unwell.',
      ],
    },
    glucose: {
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
    temperature: {
      name: 'Body temperature',
      howToMeasure:
        'Use the same thermometer and the same body site each day. Wait 15 minutes after eating, drinking or exercise.',
      selfCare: [
        'Measure again after 15 minutes.',
        'Drink fluids and rest.',
        'Note any other symptoms, such as chills, cough or aches.',
      ],
    },
    sleep: {
      name: 'Sleep',
      howToMeasure:
        'Add up all the sleep you got in the last 24 hours, naps included. Round to the nearest half hour.',
      selfCare: [
        'Keep to your scheduled sleep and wake times.',
        'Dim the lights and avoid screens in the hour before sleep.',
        'Avoid caffeine in the 6 hours before sleep.',
      ],
    },
    mood: {
      name: 'Mood',
      howToMeasure:
        'Rate how you have felt overall today, from 1 (very low) to 5 (very good). Go with your first answer.',
      selfCare: [
        'Talk with a crewmate or someone you trust.',
        'Keep to your exercise, meal and sleep routine.',
        'Make time today for something you enjoy.',
      ],
    },
  },
  measures: {
    systolic: { label: 'Systolic', unit: 'mmHg' },
    diastolic: { label: 'Diastolic', unit: 'mmHg' },
    heartRate: { label: 'Resting heart rate', unit: 'bpm' },
    glucoseFasting: { label: 'Blood glucose (fasting)', unit: 'mg/dL' },
    glucoseNonFasting: { label: 'Blood glucose (non-fasting)', unit: 'mg/dL' },
    temperatureC: { label: 'Body temperature', unit: '°C' },
    sleepHours: { label: 'Sleep', unit: 'h' },
    mood: { label: 'Mood', unit: 'of 5' },
  },
  moodLabels: { 1: 'Very low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Very good' },
  reading: {
    fasting: 'fasting',
    nonFasting: 'non-fasting',
    sleepReference: (range) => `${range} h in the last 24 h`,
    moodReference: (range) => `${range} on a 1 to 5 self-report scale`,
  },
}

// PT REVIEW NEEDED: every string in PT below is a translation of the English
// clinical text above, drafted with Claude. The team's biomedical engineer must
// review it before it is used. No meaning or number may differ from the English.
const PT: ClinicalText = {
  // PT REVIEW NEEDED
  referenceRangeLabel: 'Faixa de referência: referência clínica para adultos, baseada na Terra',
  // PT REVIEW NEEDED
  guidance: {
    green: 'Dentro da faixa de referência. Mantenha sua rotina.',
    yellow: 'Fora da faixa de referência. Meça novamente, revise os passos de autocuidado abaixo e registre de novo amanhã.',
    red: 'Muito fora da faixa de referência. Meça novamente agora. Se confirmado, informe o Oficial Médico da Tripulação e reporte ao médico de voo em solo.',
  },
  // PT REVIEW NEEDED
  selfCareGuidance: {
    yellow: 'Abaixo da faixa de referência. Revise os passos de autocuidado e registre de novo amanhã.',
    red: 'Muito abaixo da faixa de referência. Siga os passos de autocuidado e registre de novo amanhã.',
  },
  // PT REVIEW NEEDED
  urgent: 'Urgente: informe agora o Oficial Médico da Tripulação.',
  // PT REVIEW NEEDED
  marsNote: 'A comunicação com o solo tem atraso. Siga primeiro o procedimento de bordo.',
  // PT REVIEW NEEDED
  escalate: 'Informe o Oficial Médico da Tripulação e reporte ao médico de voo em solo.',
  escalateInline: 'informe o Oficial Médico da Tripulação e reporte ao médico de voo em solo.',
  redTrendOverall: (count, action) =>
    `${count === 1 ? 'Um alerta de tendência vermelho está ativo' : `${count} alertas de tendência vermelhos estão ativos`}: ${action} Veja os alertas de tendência abaixo.`,
  // PT REVIEW NEEDED
  trend: {
    escalation: (name) => `${name}: vermelho em 3 dias consecutivos`,
    sleepDebt: 'Déficit de sono: menos de 6 h de sono em 3 dias consecutivos',
    behavioralHealth: 'Saúde comportamental: humor 2 ou menos em 3 dias consecutivos',
    cardiovascular: (name) => `Tendência cardiovascular: ${name.toLowerCase()} fora da faixa de referência em 3 dias consecutivos`,
    cardiovascularAction: 'Continue medindo todos os dias e informe o Oficial Médico da Tripulação sobre a tendência.',
  },
  // PT REVIEW NEEDED: names, how to measure, self-care steps.
  indicators: {
    bloodPressure: {
      name: 'Pressão arterial',
      howToMeasure:
        'Descanse 5 minutos antes. Coloque o manguito na parte superior do braço, direto sobre a pele, na altura do coração; depois fique parado e não fale durante a medição.',
      selfCare: [
        'Descanse em silêncio por 5 minutos e meça novamente.',
        'Confira se o manguito é do tamanho certo e está direto sobre a pele, na altura do coração.',
        'Anote qualquer dor de cabeça, tontura, dor no peito ou alteração na visão, e informe.',
      ],
    },
    heartRate: {
      name: 'Frequência cardíaca de repouso',
      howToMeasure:
        'Meça após pelo menos 5 minutos de repouso, não logo depois de exercício. Use seu monitor, ou conte o pulso no punho por 30 segundos e dobre o valor.',
      selfCare: [
        'Repouse por 10 minutos e meça novamente.',
        'Beba água.',
        'Anote se você fez exercício recentemente, tomou cafeína ou não se sente bem.',
      ],
    },
    glucose: {
      name: 'Glicemia',
      howToMeasure:
        'Limpe e seque a ponta do dedo e use o glicosímetro. Marque a medição como em jejum se você não ingeriu nada além de água por pelo menos 8 horas.',
      selfCare: [
        'Se o resultado parecer inesperado, lave e seque as mãos antes de repetir o teste.',
        'Anote o que comeu por último e quando.',
      ],
      selfCareLow: [
        'Coma ou beba um carboidrato de ação rápida, como 15 g de glicose em tabletes ou meia xícara de suco de fruta, e teste de novo após 15 minutos.',
      ],
      selfCareHigh: [
        'Beba água e evite alimentos e bebidas açucarados até testar de novo.',
        'Confira se você escolheu corretamente "em jejum" ou "sem jejum". A faixa de referência depende disso.',
        'Anote qualquer sede fora do comum, vontade frequente de urinar ou cansaço, e informe.',
      ],
    },
    temperature: {
      name: 'Temperatura corporal',
      howToMeasure:
        'Use o mesmo termômetro e o mesmo local do corpo todos os dias. Espere 15 minutos depois de comer, beber ou fazer exercício.',
      selfCare: [
        'Meça novamente após 15 minutos.',
        'Beba líquidos e descanse.',
        'Anote outros sintomas, como calafrios, tosse ou dores no corpo.',
      ],
    },
    sleep: {
      name: 'Sono',
      howToMeasure:
        'Some todo o sono das últimas 24 horas, incluindo cochilos. Arredonde para a meia hora mais próxima.',
      selfCare: [
        'Mantenha os horários programados de dormir e de acordar.',
        'Diminua as luzes e evite telas na hora antes de dormir.',
        'Evite cafeína nas 6 horas antes de dormir.',
      ],
    },
    mood: {
      name: 'Humor',
      howToMeasure:
        'Avalie como você se sentiu no geral hoje, de 1 (muito baixo) a 5 (muito bom). Fique com sua primeira resposta.',
      selfCare: [
        'Converse com um colega de tripulação ou com alguém de confiança.',
        'Mantenha sua rotina de exercícios, refeições e sono.',
        'Reserve um tempo hoje para algo de que você goste.',
      ],
    },
  },
  // PT REVIEW NEEDED
  measures: {
    systolic: { label: 'Sistólica', unit: 'mmHg' },
    diastolic: { label: 'Diastólica', unit: 'mmHg' },
    heartRate: { label: 'Frequência cardíaca de repouso', unit: 'bpm' },
    glucoseFasting: { label: 'Glicemia (em jejum)', unit: 'mg/dL' },
    glucoseNonFasting: { label: 'Glicemia (sem jejum)', unit: 'mg/dL' },
    temperatureC: { label: 'Temperatura corporal', unit: '°C' },
    sleepHours: { label: 'Sono', unit: 'h' },
    mood: { label: 'Humor', unit: 'de 5' },
  },
  // PT REVIEW NEEDED
  moodLabels: { 1: 'Muito baixo', 2: 'Baixo', 3: 'Neutro', 4: 'Bom', 5: 'Muito bom' },
  // PT REVIEW NEEDED
  reading: {
    fasting: 'em jejum',
    nonFasting: 'sem jejum',
    sleepReference: (range) => `${range} h nas últimas 24 h`,
    moodReference: (range) => `${range} numa escala de autoavaliação de 1 a 5`,
  },
}

export const CLINICAL: Record<Lang, ClinicalText> = { en: EN, 'pt-BR': PT }

// ---------------------------------------------------------------------------
// Status rules (language-free)
// ---------------------------------------------------------------------------

const SEVERITY: Record<Status, number> = { green: 0, yellow: 1, red: 2 }

export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), 'green')
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

/** The status of one indicator in one entry, or null if it was not logged. */
export function readIndicator(id: IndicatorId, entry: Entry): Reading | null {
  const parts = ((): ReadingPart[] | null => {
    switch (id) {
      case 'bloodPressure':
        return entry.systolic === undefined || entry.diastolic === undefined
          ? null
          : [part('systolic', entry.systolic), part('diastolic', entry.diastolic)]
      case 'heartRate':
        return entry.heartRate === undefined ? null : [part('heartRate', entry.heartRate)]
      case 'glucose':
        // The form always records fasting or non-fasting. If the flag is
        // missing, the stricter fasting range is used.
        return entry.glucose === undefined
          ? null
          : [part(entry.glucoseFasting !== false ? 'glucoseFasting' : 'glucoseNonFasting', entry.glucose)]
      case 'temperature':
        return entry.temperatureC === undefined ? null : [part('temperatureC', entry.temperatureC)]
      case 'sleep':
        return entry.sleepHours === undefined ? null : [part('sleepHours', entry.sleepHours)]
      case 'mood':
        return entry.mood === undefined ? null : [part('mood', entry.mood)]
    }
  })()
  if (!parts) return null
  return {
    indicatorId: id,
    status: worstStatus(parts.map((p) => p.status)),
    urgent: parts.some((p) => p.urgent),
    parts,
  }
}

/** Which guidance text applies; the same in every language. */
export type GuidanceKey = Status | 'selfCareYellow' | 'selfCareRed'

/**
 * From the worst status among the readings. When that worst status comes only
 * from sleep or mood, the self-care text is used instead of "re-measure".
 */
export function guidanceKey(readings: Reading[]): GuidanceKey {
  const status = worstStatus(readings.map((r) => r.status))
  if (status === 'green') return 'green'
  const selfCareOnly = readings
    .filter((r) => r.status === status)
    .every((r) => TREND_ONLY_ESCALATION.includes(r.indicatorId))
  if (selfCareOnly) return status === 'red' ? 'selfCareRed' : 'selfCareYellow'
  return status
}

/** Whether a reading part is below or above its green range, or inside it. */
export function directionOf(part: ReadingPart): 'low' | 'high' | null {
  const { low, high } = greenRange(part.measure)
  if (part.value < low) return 'low'
  if (high !== undefined && part.value > high) return 'high'
  return null
}

// ---------------------------------------------------------------------------
// Text for the screen (the language only changes words and number format)
// ---------------------------------------------------------------------------

/** A red escalation text for the mission setting. ISS and Lunar surface leave it unchanged. */
export function forSetting(text: string, setting: MissionSetting, lang: Lang): string {
  return setting === 'Mars transit' ? `${text} ${CLINICAL[lang].marsNote}` : text
}

export function guidanceFor(readings: Reading[], setting: MissionSetting, lang: Lang): string {
  const c = CLINICAL[lang]
  const key = guidanceKey(readings)
  if (key === 'selfCareYellow') return c.selfCareGuidance.yellow
  if (key === 'selfCareRed') return c.selfCareGuidance.red
  return key === 'red' ? forSetting(c.guidance.red, setting, lang) : c.guidance[key]
}

/** Overall status box, when at least one red trend alert is active. */
export function redTrendOverall(count: number, setting: MissionSetting, lang: Lang): string {
  const c = CLINICAL[lang]
  return c.redTrendOverall(count, forSetting(c.escalateInline, setting, lang))
}

/** Self-care steps for a reading: direction-specific steps first, then the general ones. */
export function selfCareSteps(reading: Reading, lang: Lang): string[] {
  const text = CLINICAL[lang].indicators[reading.indicatorId]
  const directions = new Set(reading.parts.map(directionOf))
  return [
    ...(directions.has('low') ? (text.selfCareLow ?? []) : []),
    ...(directions.has('high') ? (text.selfCareHigh ?? []) : []),
    ...text.selfCare,
  ]
}

const fmt = (measure: Measure, value: number, lang: Lang) => num(value, lang, measure.decimals, false)

export function greenRangeText(measure: Measure, lang: Lang): string {
  const { low, high } = greenRange(measure)
  return high === undefined ? `≥ ${fmt(measure, low, lang)}` : `${fmt(measure, low, lang)}–${fmt(measure, high, lang)}`
}

/** The words and numbers shown for a reading. */
export function readingText(
  reading: Reading,
  lang: Lang,
): { valueText: string; unit: string; note?: string; referenceText: string } {
  const c = CLINICAL[lang]
  const [p, q] = reading.parts
  const range = greenRangeText(p.measure, lang)
  switch (reading.indicatorId) {
    case 'bloodPressure':
      return {
        valueText: `${fmt(p.measure, p.value, lang)}/${fmt(q.measure, q.value, lang)}`,
        unit: 'mmHg',
        referenceText: `${range} / ${greenRangeText(q.measure, lang)} mmHg`,
      }
    case 'glucose': {
      const note = p.measure.id === 'glucoseFasting' ? c.reading.fasting : c.reading.nonFasting
      return { valueText: fmt(p.measure, p.value, lang), unit: 'mg/dL', note, referenceText: `${range} mg/dL (${note})` }
    }
    case 'sleep':
      return { valueText: fmt(p.measure, p.value, lang), unit: 'h', referenceText: c.reading.sleepReference(range) }
    case 'mood':
      return {
        valueText: fmt(p.measure, p.value, lang),
        unit: c.measures.mood.unit,
        note: c.moodLabels[p.value as 1 | 2 | 3 | 4 | 5],
        referenceText: c.reading.moodReference(range),
      }
    default: {
      const unit = c.measures[p.measure.id].unit
      return { valueText: fmt(p.measure, p.value, lang), unit, referenceText: `${range} ${unit}` }
    }
  }
}
