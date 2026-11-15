// Trend rules from SPEC.md section 4, evaluated on the last 3 entries.
// The rules are language-free; trendAlertText gives the words.
import { CLINICAL, INDICATOR_IDS, forSetting, readIndicator } from '../content/indicators'
import type { IndicatorId, MissionSetting, Status } from '../content/indicators'
import type { Lang } from '../i18n/format'
import type { Entry } from '../types'

export type TrendAlert = {
  kind: 'escalation' | 'sleepDebt' | 'behavioralHealth' | 'cardiovascular'
  indicatorId: IndicatorId
  status: Status
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
  for (const id of INDICATOR_IDS) {
    const statuses = last.map((e) => readIndicator(id, e)?.status)
    if (statuses.every((s) => s === 'red')) {
      const kind = id === 'sleep' ? 'sleepDebt' : id === 'mood' ? 'behavioralHealth' : 'escalation'
      alerts.push({ kind, indicatorId: id, status: 'red', days })
    } else if (
      (id === 'bloodPressure' || id === 'heartRate') &&
      statuses.every((s) => s === 'yellow' || s === 'red')
    ) {
      alerts.push({ kind: 'cardiovascular', indicatorId: id, status: 'yellow', days })
    }
  }
  return alerts
}

/** Title and action of an alert. Red alerts add the Mars-transit line when that setting is chosen. */
export function trendAlertText(alert: TrendAlert, setting: MissionSetting, lang: Lang): { title: string; action: string } {
  const c = CLINICAL[lang]
  const name = c.indicators[alert.indicatorId].name
  const red = (text: string) => forSetting(text, setting, lang)
  switch (alert.kind) {
    case 'escalation':
      return { title: c.trend.escalation(name), action: red(c.escalate) }
    case 'sleepDebt':
      return { title: c.trend.sleepDebt, action: red(c.escalate) }
    case 'behavioralHealth':
      return { title: c.trend.behavioralHealth, action: red(c.escalate) }
    case 'cardiovascular':
      return { title: c.trend.cardiovascular(name), action: c.trend.cardiovascularAction }
  }
}
