import { OctagonAlert, Sun } from 'lucide-react'
import { useSpaceWeather } from '../lib/api'
import { formatDate } from '../lib/mission'
import type { SpaceWeatherEvent } from '../lib/nasa'
import DataModeTag, { formatUtc } from './DataModeTag'

const DONKI_HOME = 'https://ccmc.gsfc.nasa.gov/DONKI/'

function eventText(e: SpaceWeatherEvent): string {
  return e.kind === 'sep'
    ? `Solar energetic particle event, ${formatUtc(e.time)}`
    : `${e.classType} solar flare, peak ${formatUtc(e.time)}`
}

/** Dashboard banner from DONKI (SPEC 6.1). */
export default function SpaceWeatherBanner() {
  const loaded = useSpaceWeather()

  if (loaded.state !== 'ready') {
    return (
      <p className="rounded-lg border border-line px-4 py-3 text-sm text-muted">
        {loaded.state === 'loading' ? 'Loading space weather…' : 'Space weather data is unavailable right now.'}
      </p>
    )
  }

  const { mode, retrieved, data } = loaded.result
  const period =
    mode === 'live'
      ? 'in the last 7 days'
      : `from ${formatDate(data.window.start)} to ${formatDate(data.window.end)}`
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
          {alert ? 'Space weather alert' : `No major space weather events ${period}`}
        </h2>
        <DataModeTag mode={mode} retrieved={retrieved} />
      </div>

      {alert ? (
        <>
          <p className="text-sm text-muted">Events {period}:</p>
          <ul className="flex flex-col gap-1">
            {data.alerts.map((e) => (
              <li key={`${e.kind}-${e.time}`}>
                {eventText(e)}
                {e.link && (
                  <>
                    {' '}
                    <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      DONKI event page
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
              Most recent flare: {eventText(data.latestFlare)}.{' '}
              {data.latestFlare.link && (
                <a href={data.latestFlare.link} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  DONKI event page
                </a>
              )}
            </>
          ) : (
            'No solar flares were reported.'
          )}
        </p>
      )}

      <p className="text-xs text-muted">
        An alert means a solar energetic particle event or an X-class flare. Space weather data:{' '}
        <a href={DONKI_HOME} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          NASA CCMC DONKI
        </a>
        .
      </p>
    </section>
  )
}
