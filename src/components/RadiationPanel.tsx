import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MissionSetting } from '../content/indicators'
import { useRadiation } from '../lib/api'
import type { Loaded } from '../lib/api'
import { formatDate, missionDayOn, todayISO } from '../lib/mission'
import { RADIATION_ENVIRONMENTS, RADLAB_DAY } from '../lib/nasa'
import type { EnvironmentDose, EnvironmentId, HighRateCluster, Mode } from '../lib/nasa'
import { useStore } from '../state/store'
import DataModeTag from './DataModeTag'

const RADLAB_HOME = 'https://visualization.osdr.nasa.gov/radlab/'

const n0 = (v: number) => Math.round(v).toLocaleString('en-GB')
const n1 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
/** Daily dose as displayed (0.1 µGy), so the illustration multiplies exactly the number shown. */
const daily = (uGy: number) => Math.round(uGy * 10) / 10
const dose = (uGy: number) =>
  uGy >= 1000
    ? `${n0(uGy)} µGy (${(uGy / 1000).toLocaleString('en-GB', { maximumFractionDigits: 2 })} mGy)`
    : `${n1(uGy)} µGy`
const lat = (v: number) => `${Math.abs(v).toFixed(0)}°${v < 0 ? 'S' : 'N'}`
const lon = (v: number) => `${Math.abs(v).toFixed(0)}°${v < 0 ? 'W' : 'E'}`
const clock = (ts: string) => ts.slice(11, 16)
const DAY_TEXT = formatDate(RADLAB_DAY)

/** SPEC 6.3: one line per mission setting that has no measured environment of its own. */
const SETTING_NOTES: Partial<Record<MissionSetting, { text: string; see: EnvironmentId[] }>> = {
  'Lunar surface': {
    text: 'No measured lunar-surface data exists in RadLab; see lunar orbit and cislunar flight.',
    see: ['lunar-orbit', 'cislunar-orion'],
  },
  'Mars transit': {
    text: 'No measured Mars-transit data exists in RadLab; see deep space and Mars orbit.',
    see: ['deep-space', 'mars-orbit'],
  },
}

/** Radiation panel from RadLab (SPEC 6.3): six measured environments on one day. */
export default function RadiationPanel() {
  const { settings } = useStore()
  const missionDay = missionDayOn(todayISO(), settings.missionStart)
  const [selected, setSelected] = useState<EnvironmentId>('iss')
  // RADIATION_ENVIRONMENTS is a constant list, so the hooks run in the same order every render.
  const all = RADIATION_ENVIRONMENTS.map((env) => ({ env, loaded: useRadiation(env.id) }))
  const current = all.find((a) => a.env.id === selected)!
  const note = SETTING_NOTES[settings.setting]

  return (
    <section aria-labelledby="radiation-heading" className="flex flex-col gap-4 rounded-lg bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="radiation-heading" className="font-display text-lg font-semibold">
          Measured radiation, from low Earth orbit to the surface of Mars
        </h2>
        <ModesTag all={all.map((a) => a.loaded)} />
      </div>

      <p>
        Absorbed dose rate measured by six instruments on {DAY_TEXT} (RadLab timestamps), the same day for all six.
        This is one historical day of measurements, not current conditions.
      </p>
      <p className="rounded-md border border-warn px-3 py-2 text-sm">
        The instruments differ in detector design, shielding and location, so these are measured dose rates at each
        instrument, not comparable crew doses.
      </p>

      {note && (
        <p className="text-sm">
          <span className="font-semibold">{settings.setting}: </span>
          {note.text}{' '}
          {note.see.map((id, k) => (
            <span key={id}>
              {k > 0 && ' · '}
              <button type="button" className="text-accent underline" onClick={() => setSelected(id)}>
                Show {RADIATION_ENVIRONMENTS.find((e) => e.id === id)!.name.toLowerCase()}
              </button>
            </span>
          ))}
        </p>
      )}

      <DoseBars all={all} selected={selected} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Show details for</legend>
        <div className="flex flex-wrap gap-2">
          {RADIATION_ENVIRONMENTS.map((env) => (
            <label
              key={env.id}
              className="cursor-pointer rounded-md border border-control px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:font-semibold has-[:checked]:text-space has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name="radiation-environment"
                className="sr-only"
                checked={selected === env.id}
                onChange={() => setSelected(env.id)}
              />
              {env.name}
            </label>
          ))}
        </div>
      </fieldset>

      {current.loaded.state === 'loading' && <p className="text-sm text-muted">Loading radiation data…</p>}
      {current.loaded.state === 'error' && <p className="text-sm text-muted">This environment is unavailable right now.</p>}
      {current.loaded.state === 'ready' && (
        <Details d={current.loaded.result.data} mode={current.loaded.result.mode} retrieved={current.loaded.result.retrieved} missionDay={missionDay} />
      )}

      <p className="text-xs text-muted">
        Radiation data:{' '}
        <a href={RADLAB_HOME} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          NASA OSDR RadLab
        </a>
        . Spacecraft, instrument, instrument family and trajectory are shown as RadLab gives them.
      </p>
    </section>
  )
}

/** One Live/Snapshot label for the six environments, or a breakdown when they differ. */
export function ModesTag({ all }: { all: Loaded<EnvironmentDose>[] }) {
  const ready = all.flatMap((l) => (l.state === 'ready' ? [l.result] : []))
  if (ready.length === 0) return null
  const modes = new Set<Mode>(ready.map((r) => r.mode))
  if (modes.size === 1) return <DataModeTag mode={ready[0].mode} retrieved={ready[0].retrieved} />
  const live = ready.filter((r) => r.mode === 'live').map((r) => r.data.name)
  return (
    <p className="text-xs text-muted">
      Live: {live.join(', ')}. Others: Snapshot — retrieved {formatDate(ready.find((r) => r.mode === 'snapshot')!.retrieved)}.
    </p>
  )
}

function DoseBars({ all, selected }: { all: { env: (typeof RADIATION_ENVIRONMENTS)[number]; loaded: Loaded<EnvironmentDose> }[]; selected: EnvironmentId }) {
  const rows = all.flatMap(({ env, loaded }) =>
    loaded.state === 'ready' ? [{ id: env.id, name: env.name, dose: daily(loaded.result.data.dailyDose) }] : [],
  )
  if (rows.length === 0) return <p className="text-sm text-muted">Loading radiation data…</p>
  const label = `Measured daily dose on ${DAY_TEXT}: ${rows.map((r) => `${r.name} ${n1(r.dose)} µGy`).join('; ')}.`

  return (
    <div>
      <p className="mb-1 text-sm font-semibold">Measured dose for the day, µGy</p>
      <div role="img" aria-label={label} style={{ height: rows.length * 34 + 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fill: 'var(--color-ink)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Bar dataKey="dose" isAnimationActive={false} barSize={18}>
              {rows.map((r) => (
                <Cell
                  key={r.id}
                  fill={r.id === selected ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 40%, var(--color-panel))'}
                />
              ))}
              <LabelList dataKey="dose" position="right" fill="var(--color-ink)" fontSize={12} formatter={(v) => n1(Number(v))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {rows.length < all.length && <p className="text-xs text-muted">Some environments are still loading or unavailable.</p>}
    </div>
  )
}

function Details({ d, mode, retrieved, missionDay }: { d: EnvironmentDose; mode: Mode; retrieved: string; missionDay: number }) {
  const where = d.maxAt.lat !== undefined && d.maxAt.lon !== undefined ? `, ${lat(d.maxAt.lat)} ${lon(d.maxAt.lon)}` : ''
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{d.name}</h3>
          <p className="text-sm text-muted">
            Spacecraft {d.radlab.spacecraft} · instrument {d.radlab.instrument} (
            {d.instrumentId !== d.radlab.instrument && `${d.instrumentId}, `}family {d.radlab.instrumentFamily}) ·
            trajectory “{d.radlab.trajectory}” · {DAY_TEXT}
          </p>
        </div>
        <DataModeTag mode={mode} retrieved={retrieved} />
      </div>

      <DoseChart d={d} />

      <table className="w-full max-w-md text-sm tabular-nums">
        <caption className="sr-only">Dose statistics for {d.name} on {DAY_TEXT}</caption>
        <tbody>
          <Row label="Measured dose for the day" value={dose(daily(d.dailyDose))} strong />
          <Row label="Mean rate" value={`${n1(d.mean)} µGy/h`} />
          <Row label="Median rate" value={`${n1(d.median)} µGy/h`} />
          <Row label="Maximum rate" value={`${n1(d.max)} µGy/h at ${clock(d.maxAt.time)}${where}`} />
          <Row label="Readings" value={`${n0(d.readings)}; longest gap ${n0(d.longestGapMinutes)} min`} />
        </tbody>
      </table>
      <p className="text-xs text-muted">
        The measured dose is the dose rate integrated over time from 00:00 to 24:00 (trapezoid rule, readings joined by
        straight lines). Mean, median and maximum use every reading of the day.
      </p>

      <div className="rounded-md border border-line p-3">
        <p className="font-semibold">Illustration: cumulative dose by mission day {missionDay}</p>
        <p className="mt-1 text-sm tabular-nums">
          {d.name}: {missionDay} × {dose(daily(d.dailyDose))} = {dose(daily(d.dailyDose) * missionDay)}
        </p>
        <p className="mt-2 text-sm text-muted">
          An illustration only: it assumes every mission day is like this measured day at this instrument. It is not a
          personal dose record.
        </p>
      </div>

      {d.highRate && <HighRateNote cluster={d.highRate} />}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className="border-b border-line/50 align-top">
      <th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted">
        {label}
      </th>
      <td className={`py-1.5 ${strong ? 'font-semibold' : ''}`}>{value}</td>
    </tr>
  )
}

function HighRateNote({ cluster }: { cluster: HighRateCluster }) {
  const where = `latitude ${lat(cluster.latRange[1])} to ${lat(cluster.latRange[0])}, longitude ${lon(cluster.lonRange[1])} to ${lon(cluster.lonRange[0])}`
  return (
    <div className="rounded-md border border-line p-3 text-sm">
      <p className="font-semibold">Observation from this data</p>
      <p className="mt-1">
        {cluster.words
          ? `${cluster.inside} of the ${cluster.count} readings above ${cluster.threshold} µGy/h were taken while the ISS was ${cluster.words} (${where}).`
          : `The ${cluster.count} readings above ${cluster.threshold} µGy/h do not fall in a single area (${where}).`}
      </p>
      <p className="mt-1 text-xs text-muted">Our team's reading of the measurements, not a NASA statement.</p>
    </div>
  )
}

function DoseChart({ d }: { d: EnvironmentDose }) {
  const data = d.series.map(([h, rate]) => ({ h, rate }))
  const label = `Absorbed dose rate for ${d.name} over ${DAY_TEXT}, logarithmic scale, ${d.seriesNote}. Median ${n1(d.median)}, maximum ${n1(d.max)} µGy/h.`
  return (
    <div>
      <div role="img" aria-label={label} className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="h"
              type="number"
              domain={[0, 24]}
              ticks={[0, 6, 12, 18, 24]}
              tickFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`}
              tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              stroke="var(--color-line)"
            />
            <YAxis
              scale="log"
              domain={[1, 1000]}
              ticks={[1, 10, 100, 1000]}
              allowDataOverflow
              tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              stroke="var(--color-line)"
              width={44}
            />
            <ReferenceLine y={100} stroke="var(--color-muted)" strokeDasharray="2 4" />
            <Tooltip
              labelFormatter={(h) => {
                const minutes = Math.round(Number(h) * 60)
                return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
              }}
              formatter={(value) => [`${n1(Number(value))} µGy/h`, d.name]}
              contentStyle={{ background: 'var(--color-raised)', border: '1px solid var(--color-line)' }}
              labelStyle={{ color: 'var(--color-ink)' }}
              itemStyle={{ color: 'var(--color-ink)' }}
            />
            <Line dataKey="rate" stroke="var(--color-accent)" strokeWidth={1.25} dot={data.length <= 100} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        µGy/h on a logarithmic scale, so short peaks do not flatten the rest of the day. Dotted line: 100 µGy/h.{' '}
        {d.seriesNote === '5-minute averages'
          ? 'The chart shows 5-minute averages; the statistics use every reading.'
          : 'The chart shows every reading.'}
      </p>
    </div>
  )
}
