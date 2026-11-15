import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import StatusBadge from '../components/StatusBadge'
import { INDICATOR_IDS, MEASURES, greenRangeText, readIndicator, roundTo } from '../content/indicators'
import type { ClinicalText, IndicatorId, Measure } from '../content/indicators'
import { num } from '../i18n/format'
import type { Lang } from '../i18n/format'
import { useLang } from '../i18n/LangProvider'
import type { Dict } from '../i18n/ui'
import { isISODate, missionDayOn, todayISO } from '../lib/mission'
import { storeErrorText, useStore } from '../state/store'
import type { StoreError } from '../state/store'
import type { Entry } from '../types'

const inputClass =
  'w-28 rounded-md border border-control bg-space px-3 py-2 text-lg tabular-nums text-ink aria-[invalid]:border-alert'
const choiceClass =
  'cursor-pointer rounded-md border border-control px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:font-semibold has-[:checked]:text-space has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent'

type Fields = {
  systolic: string
  diastolic: string
  heartRate: string
  glucose: string
  fasting: '' | 'yes' | 'no'
  temperatureC: string
  sleepHours: string
  mood: '' | '1' | '2' | '3' | '4' | '5'
}

type Values = Omit<Entry, 'missionDay' | 'date' | 'simulated'>
type Errors = Partial<Record<IndicatorId | 'form', string>>

/** A stored value shown in the form, with a decimal comma in Portuguese. */
const text = (n: number | undefined, measure: Measure, lang: Lang) =>
  n === undefined ? '' : num(n, lang, measure.decimals, false)

function fieldsFrom(entry: Entry | undefined, lang: Lang): Fields {
  return {
    systolic: text(entry?.systolic, MEASURES.systolic, lang),
    diastolic: text(entry?.diastolic, MEASURES.diastolic, lang),
    heartRate: text(entry?.heartRate, MEASURES.heartRate, lang),
    glucose: text(entry?.glucose, MEASURES.glucoseFasting, lang),
    fasting: entry?.glucoseFasting === undefined ? '' : entry.glucoseFasting ? 'yes' : 'no',
    temperatureC: text(entry?.temperatureC, MEASURES.temperatureC, lang),
    sleepHours: text(entry?.sleepHours, MEASURES.sleepHours, lang),
    mood: (entry?.mood === undefined ? '' : String(entry.mood)) as Fields['mood'],
  }
}

type Words = { t: Dict; c: ClinicalText; lang: Lang }

/** Reads one typed number. A decimal comma or point is accepted in either language. */
function parse(raw: string, measure: Measure, { t, c, lang }: Words): { value?: number; error?: string } {
  const cleaned = raw.trim().replace(',', '.')
  if (cleaned === '') return {}
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return { error: t.checkIn.enterNumber }
  const { min, max } = measure.entryLimits
  if (n < min || n > max) {
    return { error: t.checkIn.outOfLimits(num(min, lang, 0, false), num(max, lang, 0, false), c.measures[measure.id].unit) }
  }
  return { value: roundTo(n, measure.decimals) }
}

function validate(fields: Fields, words: Words): { values: Values; errors: Errors } {
  const { t } = words
  const values: Values = {}
  const errors: Errors = {}

  const sys = parse(fields.systolic, MEASURES.systolic, words)
  const dia = parse(fields.diastolic, MEASURES.diastolic, words)
  if (sys.error || dia.error) {
    errors.bloodPressure = sys.error ?? dia.error
  } else if ((sys.value === undefined) !== (dia.value === undefined)) {
    errors.bloodPressure = t.checkIn.bothPressures
  } else if (sys.value !== undefined && dia.value !== undefined) {
    if (sys.value <= dia.value) {
      errors.bloodPressure = t.checkIn.systolicHigher
    } else {
      values.systolic = sys.value
      values.diastolic = dia.value
    }
  }

  const hr = parse(fields.heartRate, MEASURES.heartRate, words)
  if (hr.error) errors.heartRate = hr.error
  else values.heartRate = hr.value

  // Fasting and non-fasting glucose share the same entry limits.
  const glucose = parse(fields.glucose, MEASURES.glucoseFasting, words)
  if (glucose.error) {
    errors.glucose = glucose.error
  } else if (glucose.value !== undefined) {
    if (fields.fasting === '') {
      errors.glucose = t.checkIn.chooseFasting
    } else {
      values.glucose = glucose.value
      values.glucoseFasting = fields.fasting === 'yes'
    }
  }

  const temperature = parse(fields.temperatureC, MEASURES.temperatureC, words)
  if (temperature.error) errors.temperature = temperature.error
  else values.temperatureC = temperature.value

  const sleep = parse(fields.sleepHours, MEASURES.sleepHours, words)
  if (sleep.error) errors.sleep = sleep.error
  else values.sleepHours = sleep.value

  if (fields.mood !== '') values.mood = Number(fields.mood) as Entry['mood']

  const anyValue = Object.values(values).some((v) => v !== undefined)
  if (!anyValue && Object.keys(errors).length === 0) {
    errors.form = t.checkIn.atLeastOne
  }
  return { values, errors }
}

/** Green range per indicator, built from the thresholds in indicators.ts. */
function greenText(id: IndicatorId, c: ClinicalText, lang: Lang): string {
  const g = (m: Measure) => greenRangeText(m, lang)
  switch (id) {
    case 'bloodPressure':
      return `${g(MEASURES.systolic)} / ${g(MEASURES.diastolic)} mmHg`
    case 'heartRate':
      return `${g(MEASURES.heartRate)} bpm`
    case 'glucose':
      return `${g(MEASURES.glucoseFasting)} mg/dL ${c.reading.fasting}, ${g(MEASURES.glucoseNonFasting)} mg/dL ${c.reading.nonFasting}`
    case 'temperature':
      return `${g(MEASURES.temperatureC)} °C`
    case 'sleep':
      return c.reading.sleepReference(g(MEASURES.sleepHours))
    case 'mood':
      return g(MEASURES.mood)
  }
}

export default function CheckIn() {
  const { entries, settings } = useStore()
  const { t, date: formatDate } = useLang()
  const today = todayISO()
  const [date, setDate] = useState(today)

  const dateOk = isISODate(date) && date >= settings.missionStart && date <= today
  const existing = entries.find((e) => e.date === date)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">{t.checkIn.title}</h1>
        <p className="mt-2 max-w-[70ch] text-muted">{t.checkIn.intro}</p>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t.checkIn.dayLabel}
          <input
            type="date"
            min={settings.missionStart}
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-control bg-space px-3 py-2 text-ink"
          />
        </label>
        {dateOk && (
          <p className="pb-2 font-display text-xl font-semibold tabular-nums">
            {t.dashboard.missionDay(missionDayOn(date, settings.missionStart))}
          </p>
        )}
      </div>

      {dateOk ? (
        <CheckInForm key={date} date={date} existing={existing} />
      ) : (
        <p role="alert" className="text-alert">
          {t.checkIn.chooseDay(formatDate(settings.missionStart))}
        </p>
      )}
    </div>
  )
}

function CheckInForm({ date, existing }: { date: string; existing: Entry | undefined }) {
  const { settings, saveEntry } = useStore()
  const { t, c, lang, date: formatDate } = useLang()
  const navigate = useNavigate()
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(existing, lang))
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState<StoreError>()

  const missionDay = missionDayOn(date, settings.missionStart)
  const { values, errors } = validate(fields, { t, c, lang })
  const draft: Entry = { missionDay, date, ...values, simulated: existing?.simulated ?? false }
  const shown: Errors = submitted ? errors : {}

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((f) => ({ ...f, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return
    const result = saveEntry(draft)
    if (result.ok) navigate('/', { state: { savedDay: missionDay } })
    else setSaveError(result.error)
  }

  const number = (key: 'systolic' | 'diastolic' | 'heartRate' | 'glucose' | 'temperatureC' | 'sleepHours', indicator: IndicatorId, label: string, unit: string, decimal: boolean) => (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={fields[key]}
          onChange={(e) => set(key, e.target.value)}
          aria-invalid={shown[indicator] ? true : undefined}
          aria-describedby={`${indicator}-help${shown[indicator] ? ` ${indicator}-error` : ''}`}
          className={inputClass}
        />
        <span>{unit}</span>
      </span>
    </label>
  )

  const inputs: Record<IndicatorId, ReactNode> = {
    bloodPressure: (
      <div className="flex flex-wrap gap-4">
        {number('systolic', 'bloodPressure', t.checkIn.systolic, 'mmHg', false)}
        {number('diastolic', 'bloodPressure', t.checkIn.diastolic, 'mmHg', false)}
      </div>
    ),
    heartRate: number('heartRate', 'heartRate', t.checkIn.beats, 'bpm', false),
    glucose: (
      <div className="flex flex-col gap-3">
        {number('glucose', 'glucose', t.checkIn.meter, 'mg/dL', false)}
        <div role="radiogroup" aria-label={t.checkIn.fastingState} className="flex flex-wrap gap-2">
          {(['yes', 'no'] as const).map((option) => (
            <label key={option} className={choiceClass}>
              <input
                type="radio"
                name="fasting"
                className="sr-only"
                checked={fields.fasting === option}
                onChange={() => set('fasting', option)}
              />
              {option === 'yes' ? t.checkIn.fasting : t.checkIn.notFasting}
            </label>
          ))}
        </div>
      </div>
    ),
    temperature: number('temperatureC', 'temperature', t.checkIn.thermometer, '°C', true),
    sleep: number('sleepHours', 'sleep', t.checkIn.sleepHours, 'h', true),
    mood: (
      <div className="flex flex-col items-start gap-2">
        <div role="radiogroup" aria-label={t.checkIn.moodGroup} className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5] as const).map((score) => (
            <label key={score} className={choiceClass}>
              <input
                type="radio"
                name="mood"
                className="sr-only"
                checked={fields.mood === String(score)}
                onChange={() => set('mood', String(score) as Fields['mood'])}
                aria-describedby="mood-help"
              />
              <span className="font-semibold tabular-nums">{score}</span> {c.moodLabels[score]}
            </label>
          ))}
        </div>
        {fields.mood !== '' && (
          <button type="button" className="text-sm text-accent underline" onClick={() => set('mood', '')}>
            {t.checkIn.clearMood}
          </button>
        )}
      </div>
    ),
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {existing && (
        <p className="rounded-md border border-line bg-raised px-4 py-2 text-sm">
          {t.checkIn.alreadyLogged}
          {existing.simulated && t.checkIn.simulatedDay}
        </p>
      )}

      {INDICATOR_IDS.map((id) => {
        const reading = readIndicator(id, draft)
        const error = shown[id]
        return (
          <fieldset key={id} className="rounded-lg border border-line bg-panel p-4">
            <legend className="float-left mb-3 font-display text-lg font-semibold">{c.indicators[id].name}</legend>
            <div className="float-right min-h-6" aria-live="polite">
              {reading && !errors[id] && <StatusBadge status={reading.status} />}
            </div>
            <div className="clear-both grid gap-x-8 gap-y-3 md:grid-cols-2">
              <div>
                {inputs[id]}
                {error && (
                  <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-alert">
                    {error}
                  </p>
                )}
              </div>
              <div id={`${id}-help`} className="text-sm text-muted">
                <p className="text-ink">{c.indicators[id].howToMeasure}</p>
                <p className="mt-2">
                  {c.referenceRangeLabel}
                  <br />
                  {t.card.green} {greenText(id, c, lang)}
                </p>
              </div>
            </div>
          </fieldset>
        )
      })}

      {submitted && Object.keys(errors).length > 0 && (
        <p role="alert" className="text-alert">
          {errors.form ?? t.checkIn.fixFields}
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-alert">
          {storeErrorText(saveError, t, formatDate)}
        </p>
      )}

      <button
        type="submit"
        className="self-start rounded-md bg-accent px-5 py-2.5 font-semibold text-space hover:brightness-110"
      >
        {t.checkIn.save}
      </button>
    </form>
  )
}
