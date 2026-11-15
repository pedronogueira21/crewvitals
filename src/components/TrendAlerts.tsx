import { useLang } from '../i18n/LangProvider'
import { trendAlertText } from '../lib/trends'
import type { TrendAlert } from '../lib/trends'
import { useStore } from '../state/store'
import SimulatedTag from './SimulatedTag'
import StatusBadge, { STATUS_UI } from './StatusBadge'

export default function TrendAlerts({ alerts, simulated }: { alerts: TrendAlert[]; simulated: boolean }) {
  const { settings } = useStore()
  const { t, lang } = useLang()
  return (
    <section aria-labelledby="trend-alerts-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="trend-alerts-heading" className="font-display text-lg font-semibold">
          {t.trendAlerts.heading}
        </h2>
        {simulated && alerts.length > 0 && <SimulatedTag />}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">{t.trendAlerts.none}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const { title, action } = trendAlertText(alert, settings.setting, lang)
            return (
              <li
                key={`${alert.kind}-${alert.indicatorId}`}
                className={`flex flex-col gap-1 rounded-lg border border-l-4 border-line bg-panel p-4 ${STATUS_UI[alert.status].border}`}
              >
                <StatusBadge status={alert.status} />
                <p className="font-semibold">{title}</p>
                <p>{action}</p>
                <p className="text-sm text-muted">{t.trendAlerts.days(alert.days[0], alert.days[1])}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
