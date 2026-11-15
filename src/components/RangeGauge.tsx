import { greenRange } from '../content/indicators'
import type { ReadingPart } from '../content/indicators'
import { num } from '../i18n/format'
import { useLang } from '../i18n/LangProvider'
import { STATUS_UI } from './StatusBadge'

/**
 * A horizontal scale showing where a reading sits among the green, yellow and
 * red zones of its measure. The numbers under the scale are the ends of the
 * green zone.
 */
export default function RangeGauge({ part, showLabel }: { part: ReadingPart; showLabel: boolean }) {
  const { t, c, lang } = useLang()
  const { measure, value, status } = part
  const { min, max } = measure.gauge
  const step = 10 ** -measure.decimals
  const pct = (n: number) => ((Math.min(Math.max(n, min), max) - min) / (max - min)) * 100
  const f = (n: number) => num(n, lang, measure.decimals, false)
  const { label, unit } = c.measures[measure.id]

  // Zone edges are drawn halfway between the last value of one zone and the
  // first value of the next.
  const zones = measure.zones.map((zone, i) => {
    const next = measure.zones[i + 1]
    const start = pct(Number.isFinite(zone.from) ? zone.from - step / 2 : min)
    const end = pct(next ? next.from - step / 2 : max)
    return { status: zone.status, start, width: end - start }
  })

  const green = greenRange(measure)
  const greenZone = zones.find((z) => z.status === 'green')!
  const greenText = green.high === undefined ? t.gauge.orMore(f(green.low)) : t.gauge.range(f(green.low), f(green.high))

  return (
    <div role="img" aria-label={t.gauge.aria(label, f(value), unit, t.status[status], greenText)}>
      {showLabel && <p className="mb-1 text-xs text-muted">{label}</p>}
      <div className="relative h-3">
        <div className="absolute inset-0 overflow-hidden rounded-sm bg-space">
          {zones.map((zone, i) => (
            <div
              key={i}
              className={`absolute inset-y-0 ${STATUS_UI[zone.status].zone}`}
              style={{ left: `${zone.start}%`, width: `${zone.width}%` }}
            />
          ))}
        </div>
        <div
          className="absolute -inset-y-1 w-1 -translate-x-1/2 rounded-full bg-ink ring-2 ring-space"
          style={{ left: `${pct(value)}%` }}
        />
      </div>
      <div className="relative mt-1 h-4 text-xs tabular-nums text-muted" aria-hidden="true">
        <span className="absolute" style={{ left: `${greenZone.start}%` }}>
          {green.high === undefined ? `≥ ${f(green.low)}` : f(green.low)}
        </span>
        {green.high !== undefined && (
          <span className="absolute -translate-x-full" style={{ left: `${greenZone.start + greenZone.width}%` }}>
            {f(green.high)}
          </span>
        )}
      </div>
    </div>
  )
}
