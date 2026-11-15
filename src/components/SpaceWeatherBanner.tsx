import { OctagonAlert, Sun } from 'lucide-react'
import { useLang } from '../i18n/LangProvider'
import type { Dict } from '../i18n/ui'
import { useSpaceWeather } from '../lib/api'
import type { SpaceWeatherEvent } from '../lib/nasa'
import DataModeTag from './DataModeTag'

const DONKI_HOME = 'https://ccmc.gsfc.nasa.gov/DONKI/'

function eventText(e: SpaceWeatherEvent, t: Dict, utc: (iso: string) => string): string {
  return e.kind === 'sep' ? t.spaceWeather.sep(utc(e.time)) : t.spaceWeather.flare(e.classType ?? '', utc(e.time))
}

/** Dashboard banner from DONKI (SPEC 6.1). */
export default function SpaceWeatherBanner() {
  const loaded = useSpaceWeather()
  const { t, date, utc } = useLang()

  if (loaded.state !== 'ready') {
    return (
      <p className="rounded-lg border border-line px-4 py-3 text-sm text-muted">
        {loaded.state === 'loading' ? t.spaceWeather.loading : t.spaceWeather.unavailable}
      </p>
    )
  }

  const { mode, retrieved, data } = loaded.result
  const period =
    mode === 'live' ? t.spaceWeather.lastWeek : t.spaceWeather.between(date(data.window.start), date(data.window.end))
  const alert = data.alerts.length > 0

  return (
    <section
      aria-labelledby="space-weather-heading"
      className={`flex flex-col gap-2 rounded-lg border px-4 py-3 ${alert ? 'border-alert bg-panel' : 'border-line'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="space-weather-heading" className="flex items-center gap-2 font-semibold">
          {alert ? (
            <OctagonAlert aria-hidden="true" size={20} strokeWidth={2.5} className="text-alert" />
          ) : (
            <Sun aria-hidden="true" size={20} strokeWidth={2.25} className="text-muted" />
          )}
          {alert ? t.spaceWeather.alertTitle : t.spaceWeather.noneTitle(period)}
        </h2>
        <DataModeTag mode={mode} retrieved={retrieved} />
      </div>

      {alert ? (
        <>
          <p className="text-sm text-muted">{t.spaceWeather.events(period)}</p>
          <ul className="flex flex-col gap-1">
            {data.alerts.map((e) => (
              <li key={`${e.kind}-${e.time}`}>
                {eventText(e, t, utc)}
                {e.link && (
                  <>
                    {' '}
                    <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      {t.spaceWeather.eventPage}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm">
          {data.latestFlare ? (
            <>
              {t.spaceWeather.latest(eventText(data.latestFlare, t, utc))}{' '}
              {data.latestFlare.link && (
                <a href={data.latestFlare.link} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {t.spaceWeather.eventPage}
                </a>
              )}
            </>
          ) : (
            t.spaceWeather.noFlares
          )}
        </p>
      )}

      <p className="text-xs text-muted">
        {t.spaceWeather.explain}
        <a href={DONKI_HOME} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          NASA CCMC DONKI
        </a>
        .
      </p>
    </section>
  )
}
