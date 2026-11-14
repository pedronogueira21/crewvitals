import { useState } from 'react'
import type { FormEvent } from 'react'
import { OctagonAlert } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import DataControls from '../components/DataControls'
import IndicatorCard from '../components/IndicatorCard'
import RadiationPanel from '../components/RadiationPanel'
import SimulatedTag from '../components/SimulatedTag'
import SpaceWeatherBanner from '../components/SpaceWeatherBanner'
import StatusBadge from '../components/StatusBadge'
import TrendAlerts from '../components/TrendAlerts'
import UrgentNotice from '../components/UrgentNotice'
import {
  INDICATORS,
  RED_TREND_OVERALL,
  guidanceFor,
  readIndicator,
  worstStatus,
} from '../content/indicators'
import { formatDate, missionDayOn, todayISO } from '../lib/mission'
import { trendAlerts } from '../lib/trends'
import { useStore } from '../state/store'

const primaryButton =
  'inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-space hover:brightness-110'
const quietButton =
  'rounded-md border border-control px-3 py-1.5 text-sm text-ink hover:bg-raised'
const dateInput = 'rounded-md border border-control bg-space px-3 py-1.5 text-ink'

export default function Dashboard() {
  const { entries, settings } = useStore()
  const location = useLocation()
  const savedDay = (location.state as { savedDay?: number } | null)?.savedDay

  const today = todayISO()
  const missionDay = missionDayOn(today, settings.missionStart)
  const latest = entries.at(-1)

  const cards = INDICATORS.map((indicator) => ({
    indicator,
    reading: latest ? readIndicator(indicator.id, latest) : null,
  }))
  const logged = cards.flatMap((c) => (c.reading ? [c.reading] : []))
  const outside = logged.filter((r) => r.status !== 'green').length
  const overall = worstStatus(logged.map((r) => r.status))
  const urgent = logged.some((r) => r.urgent)
  const notLogged = cards.length - logged.length
  const alerts = trendAlerts(entries)
  const redTrends = alerts.filter((a) => a.status === 'red').length

  return (
    <div className="flex flex-col gap-8">
      {savedDay !== undefined && (
        <p role="status" className="rounded-md border border-line bg-raised px-4 py-2 text-sm">
          Check-in saved for mission day {savedDay}.
        </p>
      )}

      <section aria-labelledby="mission-heading">
        <h1 id="mission-heading" className="font-display text-5xl font-semibold tabular-nums sm:text-6xl">
          Mission day {missionDay}
        </h1>
        <MissionStart />
      </section>

      <SpaceWeatherBanner />

      <section aria-labelledby="overall-heading" className="rounded-lg bg-panel p-5">
        <h2 id="overall-heading" className="font-display text-lg font-semibold">
          Overall status
        </h2>

        {latest ? (
          <div className="mt-3 flex flex-col gap-3">
            <StatusBadge status={overall} large />
            <p>
              {outside === 0
                ? `All ${logged.length} logged indicators are within the reference range.`
                : `${outside} of ${logged.length} logged indicators ${outside === 1 ? 'is' : 'are'} outside the reference range.`}
              {notLogged > 0 && ` ${notLogged} not logged.`}
            </p>
            {urgent && <UrgentNotice />}
            {redTrends > 0 && (
              <p className="flex max-w-[70ch] items-start gap-2 rounded-md border border-alert px-3 py-2 font-semibold">
                <OctagonAlert aria-hidden="true" size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alert" />
                <span>
                  {RED_TREND_OVERALL(redTrends)}{' '}
                  <a href="#trend-alerts-heading" className="text-accent underline">
                    Go to trend alerts
                  </a>
                </span>
              </p>
            )}
            <p className="max-w-[70ch]">
              {redTrends > 0 && <span className="font-semibold">Latest check-in: </span>}
              {guidanceFor(logged)}
            </p>
            <p className="text-sm text-muted">
              From the check-in for mission day {latest.missionDay} ({formatDate(latest.date)}).
              {latest.date !== today && ' Nothing is logged for today yet.'}
            </p>
            {latest.simulated && <SimulatedTag />}
            <Link to="/check-in" className={`${primaryButton} self-start`}>
              {latest.date === today ? "Update today's check-in" : "Log today's check-in"}
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p>No check-ins yet. Log your first one to see your status here.</p>
            <Link to="/check-in" className={`${primaryButton} self-start`}>
              Log today's check-in
            </Link>
          </div>
        )}
      </section>

      {latest && <TrendAlerts alerts={alerts} simulated={entries.slice(-3).some((e) => e.simulated)} />}

      <section aria-labelledby="indicators-heading">
        <h2 id="indicators-heading" className="font-display text-lg font-semibold">
          Indicators
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ indicator, reading }) => (
            <IndicatorCard
              key={indicator.id}
              indicator={indicator}
              reading={reading}
              simulated={latest?.simulated ?? false}
            />
          ))}
        </div>
      </section>

      <RadiationPanel />

      <DataControls />
    </div>
  )
}

function MissionStart() {
  const { settings, setMissionStart } = useStore()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(settings.missionStart)
  const [error, setError] = useState<string>()

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = setMissionStart(value)
    if (result.ok) {
      setEditing(false)
      setError(undefined)
    } else {
      setError(result.error)
    }
  }

  if (!editing) {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-3 text-muted">
        Mission started {formatDate(settings.missionStart)}
        <button
          type="button"
          className={quietButton}
          onClick={() => {
            setValue(settings.missionStart)
            setEditing(true)
          }}
        >
          Change start date
        </button>
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Mission start date
        <input
          type="date"
          required
          max={todayISO()}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'mission-start-error' : undefined}
          className={dateInput}
        />
      </label>
      <button type="submit" className={quietButton}>
        Save start date
      </button>
      <button
        type="button"
        className={quietButton}
        onClick={() => {
          setEditing(false)
          setError(undefined)
        }}
      >
        Cancel
      </button>
      {error && (
        <p id="mission-start-error" role="alert" className="basis-full text-sm text-alert">
          {error}
        </p>
      )}
    </form>
  )
}
