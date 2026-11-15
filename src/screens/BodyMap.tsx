import { useState } from 'react'
import { Link } from 'react-router'
import BodyFigure, { REGION_STATE_UI, regionStateLabel } from '../components/BodyFigure'
import type { RegionState } from '../components/BodyFigure'
import RadiationPanel from '../components/RadiationPanel'
import RelatedStudies from '../components/RelatedStudies'
import SimulatedTag from '../components/SimulatedTag'
import SourcedList from '../components/SourcedList'
import SpaceWeatherBanner from '../components/SpaceWeatherBanner'
import StatusBadge from '../components/StatusBadge'
import { HAZARDS, REGIONS, hazardName, regionLabel, teamText } from '../content/evidence'
import type { Region, RegionId } from '../content/evidence'
import { guidanceFor, readIndicator, readingText, worstStatus } from '../content/indicators'
import type { Reading } from '../content/indicators'
import { useLang } from '../i18n/LangProvider'
import type { StudyKeyword } from '../lib/nasa'
import { useStore } from '../state/store'
import type { Entry } from '../types'

/** OSDR keywords per body-map region (SPEC 6.2). The topic names are in t.bodyMap.topics. */
const STUDY_TERMS: Record<RegionId, StudyKeyword[]> = {
  head: ['circadian', 'behavior'],
  heart: ['cardiovascular'],
  abdomen: ['glucose'],
  core: ['immune'],
  bones: ['bone loss'],
  'whole-body': ['radiation'],
}

function readingsFor(region: Region, latest: Entry | undefined): Reading[] {
  if (!latest) return []
  return region.indicators.flatMap((id) => readIndicator(id, latest) ?? [])
}

function stateOf(region: Region, latest: Entry | undefined): RegionState {
  if (region.indicators.length === 0) return 'info'
  const readings = readingsFor(region, latest)
  return readings.length === 0 ? 'none' : worstStatus(readings.map((r) => r.status))
}

export default function BodyMap() {
  const { entries } = useStore()
  const { t, lang } = useLang()
  const latest = entries.at(-1)
  const [selected, setSelected] = useState<RegionId>('head')
  const region = REGIONS.find((r) => r.id === selected)!

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">{t.bodyMap.title}</h1>
        <p className="mt-2 max-w-[70ch] text-muted">{t.bodyMap.intro}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="mx-auto w-full max-w-60 md:sticky md:top-4 md:self-start">
          <BodyFigure
            regions={REGIONS.map((r) => ({ id: r.id, label: regionLabel(r, lang), state: stateOf(r, latest) }))}
            selected={selected}
            onSelect={setSelected}
          />
          <RegionLegend />
          <p className="mt-3 text-xs text-muted">{t.bodyMap.caption}</p>
        </div>
        <RegionPanel key={region.id} region={region} latest={latest} />
      </div>
    </div>
  )
}

function RegionLegend() {
  const { t } = useLang()
  return (
    <ul aria-label={t.bodyMap.legend} className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
      {(['green', 'yellow', 'red', 'none', 'info'] as const).map((state) => {
        const { Icon, text } = REGION_STATE_UI[state]
        return (
          <li key={state} className="flex items-center gap-1.5">
            <Icon aria-hidden="true" size={14} strokeWidth={2.5} className={text} />
            {regionStateLabel(state, t)}
          </li>
        )
      })}
    </ul>
  )
}

function RegionPanel({ region, latest }: { region: Region; latest: Entry | undefined }) {
  const { settings } = useStore()
  const { t, c, lang, date } = useLang()
  const state = stateOf(region, latest)
  const readings = readingsFor(region, latest)
  const hazards = HAZARDS.filter((h) => region.hazards.includes(h.id))
  const { Icon, text } = REGION_STATE_UI[state]

  return (
    <section aria-labelledby="region-heading" className="flex flex-col gap-6 rounded-lg bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="region-heading" className="font-display text-2xl font-semibold">
          {regionLabel(region, lang)}
        </h2>
        {state === 'green' || state === 'yellow' || state === 'red' ? (
          <StatusBadge status={state} />
        ) : (
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${text}`}>
            <Icon aria-hidden="true" size={18} strokeWidth={2.25} />
            {regionStateLabel(state, t)}
          </span>
        )}
      </div>

      {region.indicators.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">{t.bodyMap.latestReadings}</h3>
          {readings.length > 0 && latest ? (
            <>
              <ul className="flex flex-col gap-3">
                {readings.map((r) => {
                  const rt = readingText(r, lang)
                  return (
                    <li key={r.indicatorId} className="rounded-md border border-line p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p>
                          <span className="font-semibold">{c.indicators[r.indicatorId].name}</span>{' '}
                          <span className="tabular-nums">{rt.valueText}</span> {rt.unit}
                          {rt.note && <span className="text-sm text-muted"> ({rt.note})</span>}
                        </p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted">{guidanceFor([r], settings.setting, lang)}</p>
                    </li>
                  )
                })}
              </ul>
              <p className="text-sm text-muted">
                {t.dashboard.fromCheckIn(latest.missionDay, date(latest.date))}{' '}
                <Link to="/trends" className="text-accent underline">
                  {t.bodyMap.seeTrends}
                </Link>
              </p>
              {latest.simulated && <SimulatedTag />}
            </>
          ) : (
            <p className="text-sm text-muted">
              {t.bodyMap.notLoggedLatest}{' '}
              <Link to="/check-in" className="text-accent underline">
                {t.bodyMap.logCheckIn}
              </Link>
            </p>
          )}
        </div>
      )}

      {region.id === 'whole-body' && (
        <div className="flex flex-col gap-4">
          <SpaceWeatherBanner />
          <RadiationPanel />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">{t.bodyMap.howAffects}</h3>
        <p className="text-sm text-muted">{t.nasaText.listLabel}</p>
        <SourcedList statements={region.nasa} />
      </div>

      {hazards.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">{t.bodyMap.hazards}</h3>
          {hazards.map((h) => (
            <details key={h.id} className="rounded-md border border-line px-3 py-2">
              <summary className="cursor-pointer font-medium">{hazardName(h, lang)}</summary>
              <div className="mt-3">
                <SourcedList statements={h.nasa} />
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">{t.bodyMap.studies}</h3>
        <p className="text-sm text-muted">{t.bodyMap.studiesIntro}</p>
        {STUDY_TERMS[region.id].map((term) => (
          <RelatedStudies key={term} term={term} topic={t.bodyMap.topics[term]} />
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <h3 className="font-semibold">{t.bodyMap.whyTrack}</h3>
        <p>{teamText(region, lang)}</p>
        <p className="text-xs text-muted">{t.nasaText.teamRationale}</p>
      </div>
    </section>
  )
}
