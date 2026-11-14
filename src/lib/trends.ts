// Trend rules from SPEC.md section 4, evaluated on the last 3 entries.
import { INDICATORS, TREND_TEXT, readIndicator } from '../content/indicators'
import type { IndicatorId, Status } from '../content/indicators'
import type { Entry } from '../types'

export type TrendAlert = {
  kind: 'escalation' | 'sleepDebt' | 'behavioralHealth' | 'cardiovascular'
  indicatorId: IndicatorId
  status: Status
  title: string
  action: string
  /** First and last mission day of the 3 entries. */
  days: [number, number]
}

/**
 * The rules need 3 entries on consecutive mission days (one entry per day,
 * so 3 entries spanning 2 days are consecutive) with the indicator logged
 * in all of them.
 *
 * Sleep < 6 h is exactly sleep red, and mood <= 2 is exactly mood red, so for
 * those two the sleep-debt and behavioral-health alerts replace the generic
 * escalation. The cardiovascular alert is checked per indicator and is not
 * shown when the same indicator already has an escalation.
 */
export function trendAlerts(entries: Entry[]): TrendAlert[] {
  const last = entries.slice(-3)
  if (last.length < 3 || last[2].missionDay - last[0].missionDay !== 2) return []
  const days: [number, number] = [last[0].missionDay, last[2].missionDay]

  const alerts: TrendAlert[] = []
  for (const { id, name } of INDICATORS) {
    const statuses = last.map((e) => readIndicator(id, e)?.status)
    if (statuses.every((s) => s === 'red')) {
      const kind = id === 'sleep' ? 'sleepDebt' : id === 'mood' ? 'behavioralHealth' : 'escalation'
      const text = kind === 'escalation' ? TREND_TEXT.escalation(name) : TREND_TEXT[kind]
      alerts.push({ kind, indicatorId: id, status: 'red', days, ...text })
    } else if (
      (id === 'bloodPressure' || id === 'heartRate') &&
      statuses.every((s) => s === 'yellow' || s === 'red')
    ) {
      alerts.push({ kind: 'cardiovascular', indicatorId: id, status: 'yellow', days, ...TREND_TEXT.cardiovascular(name) })
    }
  }
  return alerts
}
