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
import { useRadiation } from '../lib/api'
import { formatDate, missionDayOn, todayISO } from '../lib/mission'
import type { InstrumentStats, Radiation } from '../lib/nasa'
import { useStore } from '../state/store'
import DataModeTag from './DataModeTag'

const RADLAB_HOME = 'https://visualization.osdr.nasa.gov/radlab/'
const LINE_STYLE = [
  { stroke: 'var(--color-accent)', dash: undefined, name: 'solid line' },
  { stroke: 'var(--color-warn)', dash: '4 3', name: 'dashed line' },
]

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

/** Radiation panel from RadLab (SPEC 6.3). */
export default function RadiationPanel() {
  const loaded = useRadiation()
  const { settings } = useStore()
  const missionDay = missionDayOn(todayISO(), settings.missionStart)

  return (
    <section aria-labelledby="radiation-heading" className="flex flex-col gap-4 rounded-lg bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="radiation-heading" className="font-display text-lg font-semibold">
          Radiation measured aboard the ISS
        </h2>
        {loaded.state === 'ready' && <DataModeTag mode={loaded.result.mode} retrieved={loaded.result.retrieved} />}
      </div>
      {loaded.state === 'loading' && <p className="text-sm text-muted">Loading radiation data…</p>}
      {loaded.state === 'error' && <p className="text-sm text-muted">Radiation data is unavailable right now.</p>}
      {loaded.state === 'ready' && <RadiationBody data={loaded.result.data} missionDay={missionDay} />}
      <p className="text-xs text-muted">
        Radiation data:{' '}
        <a href={RADLAB_HOME} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          NASA OSDR RadLab
        </a>
        , absorbed dose rate from the DosTel instruments.
      </p>
    </section>
  )
}

function RadiationBody({ data, missionDay }: { data: Radiation; missionDay: number }) {
  const first = data.instruments[0]
  const day = formatDate(first.first.slice(0, 10))
  const window = `${day}, ${clock(first.first)} to ${clock(data.instruments.reduce((m, i) => (i.last > m ? i.last : m), first.last))}`

  return (
    <>
      <p>
        Measured aboard the ISS, {window} (RadLab timestamps). This is one historical day of measurements, not
        current conditions.
      </p>

      <DoseChart instruments={data.instruments} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm tabular-nums">
          <caption className="sr-only">Dose statistics per instrument for the measured day</caption>
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="py-1 pr-3 font-medium">Instrument</th>
              {data.instruments.map((i, k) => (
                <th key={i.id} scope="col" className="py-1 pr-3 font-medium">
                  {i.id} <span className="font-normal">({LINE_STYLE[k % 2].name})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Measured dose for the day" values={data.instruments.map((i) => dose(daily(i.dailyDose)))} strong />
            <Row label="Mean rate" values={data.instruments.map((i) => `${n1(i.mean)} µGy/h`)} />
            <Row label="Median rate" values={data.instruments.map((i) => `${n1(i.median)} µGy/h`)} />
            <Row
              label="Maximum rate"
              values={data.instruments.map(
                (i) => `${n0(i.max)} µGy/h at ${clock(i.maxAt.time)}, ${lat(i.maxAt.lat)} ${lon(i.maxAt.lon)}`,
              )}
            />
            <Row
              label="Readings"
              values={data.instruments.map(
                (i) => `${n0(i.readings)} over ${n1(i.hoursCovered)} h; longest gap ${n0(i.longestGapMinutes)} min`,
              )}
            />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        The measured dose is the dose rate integrated over time between the first and last reading of the day
        (trapezoid rule, gaps bridged by a straight line). The median is shown because a few short peaks pull the
        mean far above a typical reading.
      </p>

      <div className="rounded-md border border-line p-3">
        <p className="font-semibold">Illustration: cumulative dose by mission day {missionDay}</p>
        <ul className="mt-1 text-sm tabular-nums">
          {data.instruments.map((i) => (
            <li key={i.id}>
              {i.id}: {missionDay} × {dose(daily(i.dailyDose))} = {dose(daily(i.dailyDose) * missionDay)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">
          An illustration only: it assumes every mission day is like the measured day aboard the ISS. It is not a
          personal dose record.
        </p>
      </div>

      {data.highRate && <HighRateNote cluster={data.highRate} />}
    </>
  )
}

function Row({ label, values, strong }: { label: string; values: string[]; strong?: boolean }) {
  return (
    <tr className="border-b border-line/50 align-top">
      <th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted">
        {label}
      </th>
      {values.map((v, k) => (
        <td key={k} className={`py-1.5 pr-3 ${strong ? 'font-semibold' : ''}`}>
          {v}
        </td>
      ))}
    </tr>
  )
}

function HighRateNote({ cluster }: { cluster: NonNullable<Radiation['highRate']> }) {
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

function DoseChart({ instruments }: { instruments: InstrumentStats[] }) {
  const series = instruments.map((i) => ({ id: i.id, data: i.series.map(([h, rate]) => ({ h, rate })) }))
  const peak = Math.max(...instruments.map((i) => i.max))
  const label = `Absorbed dose rate over the measured day, logarithmic scale. ${instruments
    .map((i) => `${i.id}: median ${n1(i.median)}, maximum ${n0(i.max)} µGy/h`)
    .join('; ')}.`

  return (
    <div>
      <div role="img" aria-label={label} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
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
              domain={[1, peak > 1000 ? 10000 : 1000]}
              ticks={peak > 1000 ? [1, 10, 100, 1000, 10000] : [1, 10, 100, 1000]}
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
              formatter={(value, name) => [`${n1(Number(value))} µGy/h`, name]}
              contentStyle={{ background: 'var(--color-raised)', border: '1px solid var(--color-line)' }}
              labelStyle={{ color: 'var(--color-ink)' }}
              itemStyle={{ color: 'var(--color-ink)' }}
            />
            {series.map((s, k) => (
              <Line
                key={s.id}
                data={s.data}
                dataKey="rate"
                name={s.id}
                stroke={LINE_STYLE[k % 2].stroke}
                strokeDasharray={LINE_STYLE[k % 2].dash}
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        µGy/h on a logarithmic scale, so the short peaks do not flatten the rest of the day. Dotted line: 100 µGy/h.
        {series.map((s, k) => ` ${s.id}: ${LINE_STYLE[k % 2].name}.`).join('')}
      </p>
    </div>
  )
}
