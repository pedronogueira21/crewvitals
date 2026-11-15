import { useState } from 'react'
import type { FormEvent } from 'react'
import { OctagonAlert } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import DataControls from '../components/DataControls'
import IndicatorCard from '../components/IndicatorCard'
import RadiationPanel from '../components/RadiationPanel'
import SimulatedTag from '../components/SimulatedTag'
import { ESCALATION, sourceOf, statementText } from '../content/evidence'
import SpaceWeatherBanner from '../components/SpaceWeatherBanner'
import StatusBadge from '../components/StatusBadge'
import TrendAlerts from '../components/TrendAlerts'
import UrgentNotice from '../components/UrgentNotice'
import {
  INDICATOR_IDS,
  type MissionSetting,
  guidanceFor,
  readIndicator,
  redTrendOverall,
  worstStatus,
} from '../content/indicators'
import { useLang } from '../i18n/LangProvider'
import { missionDayOn, todayISO } from '../lib/mission'
import { trendAlerts } from '../lib/trends'
import { storeErrorText, useStore } from '../state/store'
import type { StoreError } from '../state/store'

const primaryButton =
  'inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-space hover:brightness-110'
const quietButton =
  'rounded-md border border-control px-3 py-1.5 text-sm text-ink hover:bg-raised'
const dateInput = 'rounded-md border border-control bg-space px-3 py-1.5 text-ink'

export default function Dashboard() {
  const { entries, settings } = useStore()
  const { t, lang, date } = useLang()
  const location = useLocation()
  const savedDay = (location.state as { savedDay?: number } | null)?.savedDay

  const today = todayISO()
  const missionDay = missionDayOn(today, settings.missionStart)
  const latest = entries.at(-1)

  const cards = INDICATOR_IDS.map((id) => ({ id, reading: latest ? readIndicator(id, latest) : null }))
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
          {t.dashboard.saved(savedDay)}
        </p>
      )}

      <section aria-labelledby="mission-heading">
        <h1 id="mission-heading" className="font-display text-5xl font-semibold tabular-nums sm:text-6xl">
          {t.dashboard.missionDay(missionDay)}
        </h1>
        <MissionStart />
        <MissionSettingSelect />
      </section>

      <SpaceWeatherBanner />

      <section aria-labelledby="overall-heading" className="rounded-lg bg-panel p-5">
        <h2 id="overall-heading" className="font-display text-lg font-semibold">
          {t.dashboard.overallHeading}
        </h2>

        {latest ? (
          <div className="mt-3 flex flex-col gap-3">
            <StatusBadge status={overall} large />
            <p>
              {outside === 0 ? t.dashboard.allIn(logged.length) : t.dashboard.someOut(outside, logged.length)}
              {notLogged > 0 && t.dashboard.notLogged(notLogged)}
            </p>
            {urgent && <UrgentNotice />}
            {redTrends > 0 && (
              <p className="flex max-w-[70ch] items-start gap-2 rounded-md border border-alert px-3 py-2 font-semibold">
                <OctagonAlert aria-hidden="true" size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alert" />
                <span>
                  {redTrendOverall(redTrends, settings.setting, lang)}{' '}
                  <a href="#trend-alerts-heading" className="text-accent underline">
                    {t.dashboard.goToAlerts}
                  </a>
                </span>
              </p>
            )}
            <p className="max-w-[70ch]">
              {redTrends > 0 && <span className="font-semibold">{t.dashboard.latestCheckIn}</span>}
              {guidanceFor(logged, settings.setting, lang)}
            </p>
            <p className="text-sm text-muted">
              {t.dashboard.fromCheckIn(latest.missionDay, date(latest.date))}
              {latest.date !== today && t.dashboard.nothingToday}
            </p>
            {latest.simulated && <SimulatedTag />}
            <Link to="/check-in" className={`${primaryButton} self-start`}>
              {latest.date === today ? t.dashboard.updateToday : t.dashboard.logToday}
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p>{t.dashboard.empty}</p>
            <Link to="/check-in" className={`${primaryButton} self-start`}>
              {t.dashboard.logToday}
            </Link>
          </div>
        )}
      </section>

      {latest && <TrendAlerts alerts={alerts} simulated={entries.slice(-3).some((e) => e.simulated)} />}

      <section aria-labelledby="indicators-heading">
        <h2 id="indicators-heading" className="font-display text-lg font-semibold">
          {t.dashboard.indicatorsHeading}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ id, reading }) => (
            <IndicatorCard
              key={id}
              id={id}
              reading={reading}
              simulated={latest?.simulated ?? false}
              setting={settings.setting}
            />
          ))}
        </div>
      </section>

      <RadiationPanel />

      <DataControls />
    </div>
  )
}

const MISSION_SETTINGS: MissionSetting[] = ['ISS', 'Lunar surface', 'Mars transit']

/** The NASA statement about the communication delay, from the escalation block of evidence.json. */
const DELAY_STATEMENT = ESCALATION.nasa.find((s) => /communication/i.test(s.text))

/** One line saying what the current mission setting changes. */
function MissionSettingEffect({ setting }: { setting: MissionSetting }) {
  const { t, lang } = useLang()
  if (setting === 'ISS') return <p className="basis-full text-sm">{t.dashboard.settingIss}</p>
  if (setting === 'Lunar surface') {
    return (
      <p className="basis-full text-sm">
        {t.dashboard.settingLunar}
        <a href="#radiation-heading" className="text-accent underline">
          {t.dashboard.settingLunarLink}
        </a>
        .
      </p>
    )
  }
  const source = DELAY_STATEMENT && sourceOf(DELAY_STATEMENT)
  return (
    <div className="basis-full text-sm">
      <p>{t.dashboard.settingMars}</p>
      {DELAY_STATEMENT && (
        <p className="mt-1 border-l-2 border-line pl-3">
          <span className="text-muted">{t.nasaText.inlineLabel}</span>
          {statementText(DELAY_STATEMENT, lang)}
          {source && (
            <>
              {' '}
              <span className="text-muted">{t.nasaText.source} </span>
              <a href={source.url} target="_blank" rel="noopener noreferrer" lang="en" className="text-accent underline">
                {source.title}
              </a>
              {t.nasaText.sourceSuffix}
            </>
          )}
        </p>
      )}
    </div>
  )
}

function MissionSettingSelect() {
  const { settings, setMissionSetting } = useStore()
  const { t, date } = useLang()
  const [error, setError] = useState<StoreError>()
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-muted">
      <label className="flex items-center gap-2">
        {t.dashboard.settingLabel}
        <select
          value={settings.setting}
          onChange={(e) => {
            const result = setMissionSetting(e.target.value as MissionSetting)
            setError(result.ok ? undefined : result.error)
          }}
          className="rounded-md border border-control bg-space px-3 py-1.5 text-ink"
        >
          {MISSION_SETTINGS.map((s) => (
            <option key={s} value={s}>
              {t.dashboard.settingNames[s]}
            </option>
          ))}
        </select>
      </label>
      <MissionSettingEffect setting={settings.setting} />
      {error && (
        <p role="alert" className="basis-full text-sm text-alert">
          {storeErrorText(error, t, date)}
        </p>
      )}
    </div>
  )
}

function MissionStart() {
  const { settings, setMissionStart } = useStore()
  const { t, date } = useLang()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(settings.missionStart)
  const [error, setError] = useState<StoreError>()

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
        {t.dashboard.missionStarted(date(settings.missionStart))}
        <button
          type="button"
          className={quietButton}
          onClick={() => {
            setValue(settings.missionStart)
            setEditing(true)
          }}
        >
          {t.dashboard.changeStart}
        </button>
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        {t.dashboard.startLabel}
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
        {t.dashboard.saveStart}
      </button>
      <button
        type="button"
        className={quietButton}
        onClick={() => {
          setEditing(false)
          setError(undefined)
        }}
      >
        {t.dashboard.cancel}
      </button>
      {error && (
        <p id="mission-start-error" role="alert" className="basis-full text-sm text-alert">
          {storeErrorText(error, t, date)}
        </p>
      )}
    </form>
  )
}
