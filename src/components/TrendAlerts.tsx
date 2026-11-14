import { forSetting } from '../content/indicators'
import type { TrendAlert } from '../lib/trends'
import { useStore } from '../state/store'
import SimulatedTag from './SimulatedTag'
import StatusBadge, { STATUS_UI } from './StatusBadge'

export default function TrendAlerts({ alerts, simulated }: { alerts: TrendAlert[]; simulated: boolean }) {
  const { settings } = useStore()
  return (
    <section aria-labelledby="trend-alerts-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="trend-alerts-heading" className="font-display text-lg font-semibold">
          Trend alerts
        </h2>
        {simulated && alerts.length > 0 && <SimulatedTag />}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">
          No trend alerts. Trend rules look at the last 3 check-ins on consecutive mission days.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <li
              key={`${alert.kind}-${alert.indicatorId}`}
              className={`flex flex-col gap-1 rounded-lg border border-l-4 border-line bg-panel p-4 ${STATUS_UI[alert.status].border}`}
            >
              <StatusBadge status={alert.status} />
              <p className="font-semibold">{alert.title}</p>
              <p>{alert.status === 'red' ? forSetting(alert.action, settings.setting) : alert.action}</p>
              <p className="text-sm text-muted">
                Mission days {alert.days[0]} to {alert.days[1]}.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
