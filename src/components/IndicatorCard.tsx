import { REFERENCE_RANGE_LABEL, guidanceFor, selfCareSteps } from '../content/indicators'
import type { Indicator, MissionSetting, Reading } from '../content/indicators'
import RangeGauge from './RangeGauge'
import SimulatedTag from './SimulatedTag'
import StatusBadge, { STATUS_UI } from './StatusBadge'
import UrgentNotice from './UrgentNotice'

export default function IndicatorCard({
  indicator,
  reading,
  simulated,
  setting,
}: {
  indicator: Indicator
  reading: Reading | null
  /** True when the reading comes from simulated crew data. */
  simulated: boolean
  setting: MissionSetting
}) {
  if (!reading) {
    return (
      <section
        aria-label={indicator.name}
        className="rounded-lg border border-dashed border-line p-4"
      >
        <h3 className="font-display text-lg font-semibold">{indicator.name}</h3>
        <p className="mt-2 text-sm text-muted">Not logged in this check-in.</p>
      </section>
    )
  }

  const needsAction = reading.status !== 'green'

  return (
    <section
      aria-label={indicator.name}
      className={`flex flex-col gap-3 rounded-lg border border-l-4 border-line bg-panel p-4 ${STATUS_UI[reading.status].border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{indicator.name}</h3>
        <StatusBadge status={reading.status} />
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-4xl font-semibold tabular-nums">{reading.valueText}</span>
        <span className="text-muted">{reading.unit}</span>
        {reading.note && <span className="text-sm text-muted">({reading.note})</span>}
      </p>

      {simulated && <SimulatedTag />}

      <div className="flex flex-col gap-2">
        {reading.parts.map((part) => (
          <RangeGauge key={part.measure.id} part={part} showLabel={reading.parts.length > 1} />
        ))}
      </div>

      {reading.urgent && <UrgentNotice />}

      <p className="text-sm">{guidanceFor([reading], setting)}</p>

      {needsAction && (
        <div className="text-sm">
          <p className="font-semibold">Self-care steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
            {selfCareSteps(indicator, reading).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-auto border-t border-line pt-3 text-xs text-muted">
        {REFERENCE_RANGE_LABEL}
        <br />
        Green: {reading.referenceText}
      </p>
    </section>
  )
}
