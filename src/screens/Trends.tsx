import { Link } from 'react-router'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DotItemDotProps } from 'recharts'
import SimulatedTag from '../components/SimulatedTag'
import TrendAlerts from '../components/TrendAlerts'
import { INDICATOR_IDS, MEASURES, greenRange, readIndicator, statusOf } from '../content/indicators'
import type { ClinicalText, IndicatorId, Measure, Status } from '../content/indicators'
import { num } from '../i18n/format'
import { useLang } from '../i18n/LangProvider'
import type { Dict } from '../i18n/ui'
import { trendAlerts } from '../lib/trends'
import { useStore } from '../state/store'
import type { Entry } from '../types'

type Series = {
  key: string
  label: (c: ClinicalText) => string
  value: (e: Entry) => number | undefined
  /** Measure used for the status of each point. */
  measure: (e: Entry) => Measure
  dashed?: boolean
}

type Chart = {
  series: Series[]
  /** Green bands to shade. */
  bands: Measure[]
  unit: (c: ClinicalText) => string
  /** Decimals shown in the tooltip. */
  decimals: number
  note?: (t: Dict) => string
}

const fixed = (m: Measure) => () => m

const CHARTS: Record<IndicatorId, Chart> = {
  bloodPressure: {
    series: [
      { key: 'systolic', label: (c) => c.measures.systolic.label, value: (e) => e.systolic, measure: fixed(MEASURES.systolic) },
      { key: 'diastolic', label: (c) => c.measures.diastolic.label, value: (e) => e.diastolic, measure: fixed(MEASURES.diastolic), dashed: true },
    ],
    bands: [MEASURES.systolic, MEASURES.diastolic],
    unit: () => 'mmHg',
    decimals: 0,
    note: (t) => t.trends.bpNote,
  },
  heartRate: {
    series: [{ key: 'heartRate', label: (c) => c.indicators.heartRate.name, value: (e) => e.heartRate, measure: fixed(MEASURES.heartRate) }],
    bands: [MEASURES.heartRate],
    unit: () => 'bpm',
    decimals: 0,
  },
  glucose: {
    series: [
      {
        key: 'glucose',
        label: (c) => c.indicators.glucose.name,
        value: (e) => e.glucose,
        measure: (e) => (e.glucoseFasting === false ? MEASURES.glucoseNonFasting : MEASURES.glucoseFasting),
      },
    ],
    bands: [MEASURES.glucoseNonFasting, MEASURES.glucoseFasting],
    unit: () => 'mg/dL',
    decimals: 0,
    note: (t) => t.trends.glucoseNote,
  },
  temperature: {
    series: [{ key: 'temperatureC', label: (c) => c.indicators.temperature.name, value: (e) => e.temperatureC, measure: fixed(MEASURES.temperatureC) }],
    bands: [MEASURES.temperatureC],
    unit: () => '°C',
    decimals: 1,
  },
  sleep: {
    series: [{ key: 'sleepHours', label: (c) => c.indicators.sleep.name, value: (e) => e.sleepHours, measure: fixed(MEASURES.sleepHours) }],
    bands: [MEASURES.sleepHours],
    unit: () => 'h',
    decimals: 1,
  },
  mood: {
    series: [{ key: 'mood', label: (c) => c.indicators.mood.name, value: (e) => e.mood, measure: fixed(MEASURES.mood) }],
    bands: [MEASURES.mood],
    unit: (c) => c.measures.mood.unit,
    decimals: 0,
  },
}

const STATUS_FILL: Record<Status, string> = {
  green: 'var(--color-ok)',
  yellow: 'var(--color-warn)',
  red: 'var(--color-alert)',
}

/** Same shapes as the status icons: circle, triangle, octagon. */
function StatusDot({ cx, cy, status }: { cx: number; cy: number; status: Status }) {
  const props = { fill: STATUS_FILL[status], stroke: 'var(--color-space)', strokeWidth: 1.5 }
  if (status === 'green') return <circle cx={cx} cy={cy} r={3.5} {...props} />
  if (status === 'yellow') {
    return <polygon points={`${cx},${cy - 6} ${cx + 6},${cy + 4.5} ${cx - 6},${cy + 4.5}`} {...props} />
  }
  const r = 6
  const points = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
  return <polygon points={points} {...props} />
}

export default function Trends() {
  const { entries } = useStore()
  const { t, c } = useLang()

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-semibold">{t.trends.title}</h1>
        <p className="text-muted">
          {t.trends.emptyBefore}
          <Link to="/" className="text-accent underline">
            {t.trends.emptyLink}
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold">{t.trends.title}</h1>
        <p className="mt-2 max-w-[70ch] text-muted">{t.trends.intro}</p>
        <Legend />
      </div>

      <TrendAlerts alerts={trendAlerts(entries)} simulated={entries.slice(-3).some((e) => e.simulated)} />

      <div className="grid gap-4 lg:grid-cols-2">
        {INDICATOR_IDS.map((id) => (
          <TrendChart key={id} id={id} name={c.indicators[id].name} entries={entries} />
        ))}
      </div>
    </div>
  )
}

function Legend() {
  const { t } = useLang()
  return (
    <ul aria-label={t.trends.markers} className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
      {(['green', 'yellow', 'red'] as const).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <StatusDot cx={8} cy={8.5} status={status} />
          </svg>
          {t.status[status]}
        </li>
      ))}
    </ul>
  )
}

function TrendChart({ id, name, entries }: { id: IndicatorId; name: string; entries: Entry[] }) {
  const { t, c, lang } = useLang()
  const chart = CHARTS[id]
  const unit = chart.unit(c)
  const tick = (v: number) => num(v, lang, Number.isInteger(v) ? 0 : 1, false)
  const shown = entries.filter((e) => chart.series.some((s) => s.value(e) !== undefined))
  const outside = shown.flatMap((e) => {
    const status = readIndicator(id, e)?.status
    return status && status !== 'green' ? [{ day: e.missionDay, status }] : []
  })

  const data = shown.map((e) => {
    const row: Record<string, number | Status | undefined> = { day: e.missionDay }
    for (const s of chart.series) {
      const v = s.value(e)
      row[s.key] = v
      if (v !== undefined) row[`${s.key}Status`] = statusOf(s.measure(e), v)
    }
    return row
  })

  const lo = Math.min(...chart.bands.map((m) => m.gauge.min))
  const hi = Math.max(...chart.bands.map((m) => m.gauge.max))
  const outsideText =
    outside.length === 0
      ? t.trends.allIn
      : t.trends.outside(outside.map((o) => t.trends.dayItem(o.day, t.status[o.status].toLowerCase())).join(', '))

  return (
    <section aria-label={t.trends.sectionAria(name)} className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          {name} <span className="text-sm font-normal text-muted">({unit})</span>
        </h2>
        {shown.some((e) => e.simulated) && <SimulatedTag />}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t.trends.notLoggedYet}</p>
      ) : (
        <>
          <div role="img" aria-label={t.trends.chartAria(name, shown.length, outsideText)} className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} vertical={false} />
                {chart.bands.map((m) => {
                  const g = greenRange(m)
                  return (
                    <ReferenceArea
                      key={m.id}
                      y1={g.low}
                      y2={g.high ?? hi}
                      fill="var(--color-ok)"
                      fillOpacity={0.14}
                      strokeOpacity={0}
                    />
                  )
                })}
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  allowDecimals={false}
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  stroke="var(--color-line)"
                />
                <YAxis
                  domain={[(min: number) => Math.min(min, lo), (max: number) => Math.max(max, hi)]}
                  allowDecimals={id !== 'mood'}
                  tickFormatter={tick}
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  stroke="var(--color-line)"
                />
                <Tooltip
                  labelFormatter={(day) => t.trends.tooltipDay(String(day))}
                  formatter={(value, label) => [`${num(Number(value), lang, chart.decimals, false)} ${unit}`, label]}
                  contentStyle={{ background: 'var(--color-raised)', border: '1px solid var(--color-line)' }}
                  labelStyle={{ color: 'var(--color-ink)' }}
                  itemStyle={{ color: 'var(--color-ink)' }}
                />
                {chart.series.map((s) => (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    name={s.label(c)}
                    stroke="var(--color-accent)"
                    strokeWidth={1.75}
                    strokeDasharray={s.dashed ? '5 4' : undefined}
                    isAnimationActive={false}
                    dot={({ cx, cy, payload, index }: DotItemDotProps) =>
                      cx == null || cy == null || !payload[`${s.key}Status`] ? (
                        <g key={index} />
                      ) : (
                        <StatusDot key={index} cx={cx} cy={cy} status={payload[`${s.key}Status`]} />
                      )
                    }
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm">{outsideText}</p>
          {chart.note && <p className="text-xs text-muted">{chart.note(t)}</p>}
        </>
      )}

      <p className="mt-auto border-t border-line pt-3 text-xs text-muted">{c.referenceRangeLabel}</p>
    </section>
  )
}
