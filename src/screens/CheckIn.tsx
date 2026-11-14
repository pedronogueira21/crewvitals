import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import StatusBadge from '../components/StatusBadge'
import {
  INDICATORS,
  MEASURES,
  MOOD_LABELS,
  REFERENCE_RANGE_LABEL,
  greenRangeText,
  readIndicator,
  roundTo,
} from '../content/indicators'
import type { IndicatorId, Measure } from '../content/indicators'
import { formatDate, isISODate, missionDayOn, todayISO } from '../lib/mission'
import { useStore } from '../state/store'
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

const text = (n: number | undefined) => (n === undefined ? '' : String(n))

function fieldsFrom(entry: Entry | undefined): Fields {
  return {
    systolic: text(entry?.systolic),
    diastolic: text(entry?.diastolic),
    heartRate: text(entry?.heartRate),
    glucose: text(entry?.glucose),
    fasting: entry?.glucoseFasting === undefined ? '' : entry.glucoseFasting ? 'yes' : 'no',
    temperatureC: text(entry?.temperatureC),
    sleepHours: text(entry?.sleepHours),
    mood: text(entry?.mood) as Fields['mood'],
  }
}

/** Reads one typed number. A decimal comma is accepted. */
function parse(raw: string, measure: Measure): { value?: number; error?: string } {
  const cleaned = raw.trim().replace(',', '.')
  if (cleaned === '') return {}
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return { error: 'Enter a number.' }
  const { min, max } = measure.entryLimits
  if (n < min || n > max) {
    return { error: `Enter a value between ${min} and ${max} ${measure.unit}, or leave it empty.` }
  }
  return { value: roundTo(n, measure.decimals) }
}

function validate(fields: Fields): { values: Values; errors: Errors } {
  const values: Values = {}
  const errors: Errors = {}

  const sys = parse(fields.systolic, MEASURES.systolic)
  const dia = parse(fields.diastolic, MEASURES.diastolic)
  if (sys.error || dia.error) {
    errors.bloodPressure = sys.error ?? dia.error
  } else if ((sys.value === undefined) !== (dia.value === undefined)) {
    errors.bloodPressure = 'Enter both systolic and diastolic, or leave both empty.'
  } else if (sys.value !== undefined && dia.value !== undefined) {
    if (sys.value <= dia.value) {
      errors.bloodPressure = 'Systolic should be higher than diastolic. Check the two numbers.'
    } else {
      values.systolic = sys.value
      values.diastolic = dia.value
    }
  }

  const hr = parse(fields.heartRate, MEASURES.heartRate)
  if (hr.error) errors.heartRate = hr.error
  else values.heartRate = hr.value

  // Fasting and non-fasting glucose share the same entry limits.
  const glucose = parse(fields.glucose, MEASURES.glucoseFasting)
  if (glucose.error) {
    errors.glucose = glucose.error
  } else if (glucose.value !== undefined) {
    if (fields.fasting === '') {
      errors.glucose = 'Choose fasting or not fasting. The reference range depends on it.'
    } else {
      values.glucose = glucose.value
      values.glucoseFasting = fields.fasting === 'yes'
    }
  }

  const temperature = parse(fields.temperatureC, MEASURES.temperatureC)
  if (temperature.error) errors.temperature = temperature.error
  else values.temperatureC = temperature.value

  const sleep = parse(fields.sleepHours, MEASURES.sleepHours)
  if (sleep.error) errors.sleep = sleep.error
  else values.sleepHours = sleep.value

  if (fields.mood !== '') values.mood = Number(fields.mood) as Entry['mood']

  const anyValue = Object.values(values).some((v) => v !== undefined)
  if (!anyValue && Object.keys(errors).length === 0) {
    errors.form = 'Enter at least one measurement.'
  }
  return { values, errors }
}

const sys = MEASURES.systolic
const dia = MEASURES.diastolic

/** Green range per indicator, built from the thresholds in indicators.ts. */
const GREEN_TEXT: Record<IndicatorId, string> = {
  bloodPressure: `${greenRangeText(sys)} / ${greenRangeText(dia)} mmHg`,
  heartRate: `${greenRangeText(MEASURES.heartRate)} bpm`,
  glucose: `${greenRangeText(MEASURES.glucoseFasting)} mg/dL fasting, ${greenRangeText(MEASURES.glucoseNonFasting)} mg/dL non-fasting`,
  temperature: `${greenRangeText(MEASURES.temperatureC)} °C`,
  sleep: `${greenRangeText(MEASURES.sleepHours)} h in the last 24 h`,
  mood: `${greenRangeText(MEASURES.mood)}`,
}

export default function CheckIn() {
  const { entries, settings } = useStore()
  const today = todayISO()
  const [date, setDate] = useState(today)

  const dateOk = isISODate(date) && date >= settings.missionStart && date <= today
  const existing = entries.find((e) => e.date === date)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Daily check-in</h1>
        <p className="mt-2 max-w-[70ch] text-muted">
          Log what you measured. Leave empty anything you did not measure today.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Day of this check-in
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
            Mission day {missionDayOn(date, settings.missionStart)}
          </p>
        )}
      </div>

      {dateOk ? (
        <CheckInForm key={date} date={date} existing={existing} />
      ) : (
        <p role="alert" className="text-alert">
          Choose a day between the mission start ({formatDate(settings.missionStart)}) and today.
        </p>
      )}
    </div>
  )
}

function CheckInForm({ date, existing }: { date: string; existing: Entry | undefined }) {
  const { settings, saveEntry } = useStore()
  const navigate = useNavigate()
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(existing))
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState<string>()

  const missionDay = missionDayOn(date, settings.missionStart)
  const { values, errors } = validate(fields)
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
        {number('systolic', 'bloodPressure', 'Systolic (top number)', 'mmHg', false)}
        {number('diastolic', 'bloodPressure', 'Diastolic (bottom number)', 'mmHg', false)}
      </div>
    ),
    heartRate: number('heartRate', 'heartRate', 'Beats per minute', 'bpm', false),
    glucose: (
      <div className="flex flex-col gap-3">
        {number('glucose', 'glucose', 'Meter reading', 'mg/dL', false)}
        <div role="radiogroup" aria-label="Fasting state" className="flex flex-wrap gap-2">
          {(['yes', 'no'] as const).map((option) => (
            <label key={option} className={choiceClass}>
              <input
                type="radio"
                name="fasting"
                className="sr-only"
                checked={fields.fasting === option}
                onChange={() => set('fasting', option)}
              />
              {option === 'yes' ? 'Fasting' : 'Not fasting'}
            </label>
          ))}
        </div>
      </div>
    ),
    temperature: number('temperatureC', 'temperature', 'Thermometer reading', '°C', true),
    sleep: number('sleepHours', 'sleep', 'Hours slept in the last 24 h', 'h', true),
    mood: (
      <div className="flex flex-col items-start gap-2">
        <div role="radiogroup" aria-label="Mood, 1 to 5" className="flex flex-wrap gap-2">
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
              <span className="font-semibold tabular-nums">{score}</span> {MOOD_LABELS[score]}
            </label>
          ))}
        </div>
        {fields.mood !== '' && (
          <button type="button" className="text-sm text-accent underline" onClick={() => set('mood', '')}>
            Clear mood rating
          </button>
        )}
      </div>
    ),
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {existing && (
        <p className="rounded-md border border-line bg-raised px-4 py-2 text-sm">
          You already logged this day. Saving replaces that check-in.
          {existing.simulated && ' This day holds simulated crew data.'}
        </p>
      )}

      {INDICATORS.map((indicator) => {
        const reading = readIndicator(indicator.id, draft)
        const error = shown[indicator.id]
        return (
          <fieldset key={indicator.id} className="rounded-lg border border-line bg-panel p-4">
            <legend className="float-left mb-3 font-display text-lg font-semibold">
              {indicator.name}
            </legend>
            <div className="float-right min-h-6" aria-live="polite">
              {reading && !errors[indicator.id] && <StatusBadge status={reading.status} />}
            </div>
            <div className="clear-both grid gap-x-8 gap-y-3 md:grid-cols-2">
              <div>
                {inputs[indicator.id]}
                {error && (
                  <p id={`${indicator.id}-error`} role="alert" className="mt-2 text-sm text-alert">
                    {error}
                  </p>
                )}
              </div>
              <div id={`${indicator.id}-help`} className="text-sm text-muted">
                <p className="text-ink">{indicator.howToMeasure}</p>
                <p className="mt-2">
                  {REFERENCE_RANGE_LABEL}
                  <br />
                  Green: {GREEN_TEXT[indicator.id]}
                </p>
              </div>
            </div>
          </fieldset>
        )
      })}

      {submitted && Object.keys(errors).length > 0 && (
        <p role="alert" className="text-alert">
          {errors.form ?? 'Fix the fields marked above, then save again.'}
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-alert">
          {saveError}
        </p>
      )}

      <button
        type="submit"
        className="self-start rounded-md bg-accent px-5 py-2.5 font-semibold text-space hover:brightness-110"
      >
        Save check-in
      </button>
    </form>
  )
}
