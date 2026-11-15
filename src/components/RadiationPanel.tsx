import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MissionSetting } from '../content/indicators'
import { useLang } from '../i18n/LangProvider'
import { useRadiation } from '../lib/api'
import type { Loaded } from '../lib/api'
import { missionDayOn, todayISO } from '../lib/mission'
import { RADIATION_ENVIRONMENTS, RADLAB_DAY } from '../lib/nasa'
import type { EnvironmentDose, EnvironmentId, HighRateCluster, Mode } from '../lib/nasa'
import { useStore } from '../state/store'
import DataModeTag from './DataModeTag'

const RADLAB_HOME = 'https://visualization.osdr.nasa.gov/radlab/'

/** Daily dose as displayed (0.1 µGy), so the illustration multiplies exactly the number shown. */
const daily = (uGy: number) => Math.round(uGy * 10) / 10
const clock = (ts: string) => ts.slice(11, 16)

/** Number, dose and position formats in the chosen language. */
function useFormats() {
  const { t, num, date } = useLang()
  const n0 = (v: number) => num(Math.round(v))
  const n1 = (v: number) => num(v, 1)
  const h = t.radiation.hemispheres
  return {
    n0,
    n1,
    dose: (uGy: number) => (uGy >= 1000 ? `${n0(uGy)} µGy (${num(uGy / 1000, 2)} mGy)` : `${n1(uGy)} µGy`),
    lat: (v: number) => `${Math.abs(v).toFixed(0)}°${v < 0 ? h.s : h.n}`,
    lon: (v: number) => `${Math.abs(v).toFixed(0)}°${v < 0 ? h.w : h.e}`,
    day: date(RADLAB_DAY),
  }
}

/** SPEC 6.3: one line per mission setting that has no measured environment of its own. */
const SETTING_NOTES: Partial<Record<MissionSetting, { key: 'settingLunar' | 'settingMars'; see: EnvironmentId[] }>> = {
  'Lunar surface': { key: 'settingLunar', see: ['lunar-orbit', 'cislunar-orion'] },
  'Mars transit': { key: 'settingMars', see: ['deep-space', 'mars-orbit'] },
}

/** Radiation panel from RadLab (SPEC 6.3): six measured environments on one day. */
export default function RadiationPanel() {
  const { settings } = useStore()
  const { t } = useLang()
  const f = useFormats()
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
          {t.radiation.heading}
        </h2>
        <ModesTag all={all.map((a) => a.loaded)} />
      </div>

      <p>{t.radiation.intro(f.day)}</p>
      <p className="rounded-md border border-warn px-3 py-2 text-sm">{t.radiation.caveat}</p>

      {note && (
        <p className="text-sm">
          <span className="font-semibold">{t.dashboard.settingNames[settings.setting]}: </span>
          {t.radiation[note.key]}{' '}
          {note.see.map((id, k) => (
            <span key={id}>
              {k > 0 && ' · '}
              <button type="button" className="text-accent underline" onClick={() => setSelected(id)}>
                {t.radiation.show(t.radiation.envs[id])}
              </button>
            </span>
          ))}
        </p>
      )}

      <DoseBars all={all} selected={selected} onSelect={setSelected} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t.radiation.picker}</legend>
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
              {t.radiation.envs[env.id]}
            </label>
          ))}
        </div>
      </fieldset>

      {current.loaded.state === 'loading' && <p className="text-sm text-muted">{t.radiation.loading}</p>}
      {current.loaded.state === 'error' && <p className="text-sm text-muted">{t.radiation.envUnavailable}</p>}
      {current.loaded.state === 'ready' && (
        <Details
          d={current.loaded.result.data}
          mode={current.loaded.result.mode}
          retrieved={current.loaded.result.retrieved}
          missionDay={missionDay}
        />
      )}

      <p className="text-xs text-muted">
        {t.radiation.credit}
        <a href={RADLAB_HOME} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          NASA OSDR RadLab
        </a>
        {t.radiation.creditNote}
      </p>
    </section>
  )
}

/** One Live/Snapshot label for the six environments, or a breakdown when they differ. */
export function ModesTag({ all }: { all: Loaded<EnvironmentDose>[] }) {
  const { t, date } = useLang()
  const ready = all.flatMap((l) => (l.state === 'ready' ? [l.result] : []))
  if (ready.length === 0) return null
  const modes = new Set<Mode>(ready.map((r) => r.mode))
  if (modes.size === 1) return <DataModeTag mode={ready[0].mode} retrieved={ready[0].retrieved} />
  const live = ready.filter((r) => r.mode === 'live').map((r) => t.radiation.envs[r.data.id])
  const snapshot = ready.find((r) => r.mode === 'snapshot')!
  return <p className="text-xs text-muted">{t.mode.mixed(live.join(', '), date(snapshot.retrieved))}</p>
}

/**
 * Measured daily dose of the six environments as bars. Each bar is a button:
 * click, Enter or Space selects that environment, like the picker below.
 */
function DoseBars({
  all,
  selected,
  onSelect,
}: {
  all: { env: (typeof RADIATION_ENVIRONMENTS)[number]; loaded: Loaded<EnvironmentDose> }[]
  selected: EnvironmentId
  onSelect: (id: EnvironmentId) => void
}) {
  const { t } = useLang()
  const f = useFormats()
  const rows = all.flatMap(({ env, loaded }) =>
    loaded.state === 'ready'
      ? [{ id: env.id, name: t.radiation.envs[env.id], dose: daily(loaded.result.data.dailyDose) }]
      : [],
  )
  if (rows.length === 0) return <p className="text-sm text-muted">{t.radiation.loading}</p>
  const top = Math.max(...rows.map((r) => r.dose))

  return (
    <div>
      <p id="dose-bars-heading" className="mb-2 text-sm font-semibold">
        {t.radiation.barsHeading} <span className="font-normal text-muted">{t.radiation.barsHint}</span>
      </p>
      <div role="group" aria-labelledby="dose-bars-heading" className="flex flex-col gap-1">
        {rows.map((r) => {
          const isSelected = r.id === selected
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={t.radiation.barAria(r.name, f.n1(r.dose))}
              onClick={() => onSelect(r.id)}
              className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm hover:bg-raised sm:grid-cols-[11rem_1fr]"
            >
              <span className={`truncate ${isSelected ? 'font-semibold text-ink' : 'text-muted'}`}>{r.name}</span>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-4 rounded-sm ${isSelected ? 'bg-accent' : 'bg-accent/40'}`}
                  style={{ width: `${(r.dose / top) * 80}%` }}
                />
                <span className="shrink-0 tabular-nums">{f.n1(r.dose)}</span>
              </span>
            </button>
          )
        })}
      </div>
      {rows.length < all.length && <p className="text-xs text-muted">{t.radiation.someMissing}</p>}
    </div>
  )
}

function Details({ d, mode, retrieved, missionDay }: { d: EnvironmentDose; mode: Mode; retrieved: string; missionDay: number }) {
  const { t } = useLang()
  const f = useFormats()
  const name = t.radiation.envs[d.id]
  const where = d.maxAt.lat !== undefined && d.maxAt.lon !== undefined ? `, ${f.lat(d.maxAt.lat)} ${f.lon(d.maxAt.lon)}` : ''
  const idPart = d.instrumentId !== d.radlab.instrument ? `${d.instrumentId}, ` : ''
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-muted">
            {t.radiation.detail(
              d.radlab.spacecraft,
              d.radlab.instrument,
              idPart,
              d.radlab.instrumentFamily,
              d.radlab.trajectory,
              f.day,
            )}
          </p>
        </div>
        <DataModeTag mode={mode} retrieved={retrieved} />
      </div>

      <DoseChart d={d} />

      <table className="w-full max-w-md text-sm tabular-nums">
        <caption className="sr-only">{t.radiation.statsCaption(name, f.day)}</caption>
        <tbody>
          <Row label={t.radiation.dose} value={f.dose(daily(d.dailyDose))} strong />
          <Row label={t.radiation.mean} value={`${f.n1(d.mean)} µGy/h`} />
          <Row label={t.radiation.median} value={`${f.n1(d.median)} µGy/h`} />
          <Row label={t.radiation.max} value={t.radiation.maxValue(f.n1(d.max), clock(d.maxAt.time), where)} />
          <Row label={t.radiation.readings} value={t.radiation.readingsValue(f.n0(d.readings), f.n0(d.longestGapMinutes))} />
        </tbody>
      </table>
      <p className="text-xs text-muted">{t.radiation.method}</p>

      <div className="rounded-md border border-line p-3">
        <p className="font-semibold">{t.radiation.illustration(missionDay)}</p>
        <p className="mt-1 text-sm tabular-nums">
          {name}: {missionDay} × {f.dose(daily(d.dailyDose))} = {f.dose(daily(d.dailyDose) * missionDay)}
        </p>
        <p className="mt-2 text-sm text-muted">{t.radiation.illustrationNote}</p>
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
  const { t } = useLang()
  const f = useFormats()
  const where = t.radiation.where(
    f.lat(cluster.latRange[1]),
    f.lat(cluster.latRange[0]),
    f.lon(cluster.lonRange[1]),
    f.lon(cluster.lonRange[0]),
  )
  return (
    <div className="rounded-md border border-line p-3 text-sm">
      <p className="font-semibold">{t.radiation.observation}</p>
      <p className="mt-1">
        {cluster.area
          ? t.radiation.clusterIn(cluster.inside, cluster.count, cluster.threshold, t.radiation.areas[cluster.area], where)
          : t.radiation.clusterSpread(cluster.count, cluster.threshold, where)}
      </p>
      <p className="mt-1 text-xs text-muted">{t.radiation.observationNote}</p>
    </div>
  )
}

function DoseChart({ d }: { d: EnvironmentDose }) {
  const { t, num } = useLang()
  const f = useFormats()
  const name = t.radiation.envs[d.id]
  const data = d.series.map(([h, rate]) => ({ h, rate }))
  const label = t.radiation.chartAria(name, f.day, t.radiation.seriesNotes[d.seriesNote], f.n1(d.median), f.n1(d.max))
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
              tickFormatter={(v: number) => num(v)}
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
              formatter={(value) => [`${f.n1(Number(value))} µGy/h`, name]}
              contentStyle={{ background: 'var(--color-raised)', border: '1px solid var(--color-line)' }}
              labelStyle={{ color: 'var(--color-ink)' }}
              itemStyle={{ color: 'var(--color-ink)' }}
            />
            <Line dataKey="rate" stroke="var(--color-accent)" strokeWidth={1.25} dot={data.length <= 100} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        {t.radiation.chartNote}
        {d.seriesNote === '5-minute averages' ? t.radiation.averagesNote : t.radiation.readingsNote}
      </p>
    </div>
  )
}
