import { useState } from 'react'
import { Link } from 'react-router'
import BodyFigure, { REGION_STATE_UI } from '../components/BodyFigure'
import type { RegionState } from '../components/BodyFigure'
import RadiationPanel from '../components/RadiationPanel'
import RelatedStudies from '../components/RelatedStudies'
import SimulatedTag from '../components/SimulatedTag'
import SourcedList from '../components/SourcedList'
import SpaceWeatherBanner from '../components/SpaceWeatherBanner'
import StatusBadge from '../components/StatusBadge'
import { HAZARDS, REGIONS } from '../content/evidence'
import type { Region, RegionId } from '../content/evidence'
import { INDICATORS, guidanceFor, readIndicator, worstStatus } from '../content/indicators'
import type { Reading } from '../content/indicators'
import { formatDate } from '../lib/mission'
import type { StudyKeyword } from '../lib/nasa'
import { useStore } from '../state/store'
import type { Entry } from '../types'

/** OSDR keyword per indicator (SPEC 6.2), grouped by body-map region. */
const STUDY_TOPICS: Record<RegionId, { term: StudyKeyword; topic: string }[]> = {
  head: [
    { term: 'circadian', topic: 'Sleep' },
    { term: 'behavior', topic: 'Mood' },
  ],
  heart: [{ term: 'cardiovascular', topic: 'Blood pressure and heart rate' }],
  abdomen: [{ term: 'glucose', topic: 'Blood glucose' }],
  core: [{ term: 'immune', topic: 'Body temperature' }],
  bones: [{ term: 'bone loss', topic: 'Bones and muscles' }],
  'whole-body': [{ term: 'radiation', topic: 'Radiation exposure' }],
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
  const latest = entries.at(-1)
  const [selected, setSelected] = useState<RegionId>('head')
  const region = REGIONS.find((r) => r.id === selected)!

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Body map</h1>
        <p className="mt-2 max-w-[70ch] text-muted">
          Select a region to see your latest readings for it and how spaceflight affects it.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="mx-auto w-full max-w-60 md:sticky md:top-4 md:self-start">
          <BodyFigure
            regions={REGIONS.map((r) => ({ id: r.id, label: r.label, state: stateOf(r, latest) }))}
            selected={selected}
            onSelect={setSelected}
          />
          <RegionLegend />
          <p className="mt-3 text-xs text-muted">Schematic figure drawn in code with AI assistance.</p>
        </div>
        <RegionPanel key={region.id} region={region} latest={latest} />
      </div>
    </div>
  )
}

function RegionLegend() {
  return (
    <ul aria-label="Region markers" className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
      {(['green', 'yellow', 'red', 'none', 'info'] as const).map((state) => {
        const { Icon, label, text } = REGION_STATE_UI[state]
        return (
          <li key={state} className="flex items-center gap-1.5">
            <Icon aria-hidden="true" size={14} strokeWidth={2.5} className={text} />
            {label}
          </li>
        )
      })}
    </ul>
  )
}

function RegionPanel({ region, latest }: { region: Region; latest: Entry | undefined }) {
  const state = stateOf(region, latest)
  const readings = readingsFor(region, latest)
  const hazards = HAZARDS.filter((h) => region.hazards.includes(h.id))
  const { Icon, label, text } = REGION_STATE_UI[state]

  return (
    <section aria-labelledby="region-heading" className="flex flex-col gap-6 rounded-lg bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="region-heading" className="font-display text-2xl font-semibold">
          {region.label}
        </h2>
        {state === 'green' || state === 'yellow' || state === 'red' ? (
          <StatusBadge status={state} />
        ) : (
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${text}`}>
            <Icon aria-hidden="true" size={18} strokeWidth={2.25} />
            {label}
          </span>
        )}
      </div>

      {region.indicators.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">Your latest readings</h3>
          {readings.length > 0 && latest ? (
            <>
              <ul className="flex flex-col gap-3">
                {readings.map((r) => (
                  <li key={r.indicatorId} className="rounded-md border border-line p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p>
                        <span className="font-semibold">{INDICATORS.find((i) => i.id === r.indicatorId)!.name}</span>{' '}
                        <span className="tabular-nums">{r.valueText}</span> {r.unit}
                        {r.note && <span className="text-sm text-muted"> ({r.note})</span>}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{guidanceFor([r])}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                From the check-in for mission day {latest.missionDay} ({formatDate(latest.date)}).{' '}
                <Link to="/trends" className="text-accent underline">
                  See trends
                </Link>
              </p>
              {latest.simulated && <SimulatedTag />}
            </>
          ) : (
            <p className="text-sm text-muted">
              Not logged in the latest check-in.{' '}
              <Link to="/check-in" className="text-accent underline">
                Log a check-in
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
        <h3 className="font-semibold">How spaceflight affects this region</h3>
        <p className="text-sm text-muted">Paraphrased from NASA sources.</p>
        <SourcedList statements={region.nasa} />
      </div>

      {hazards.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Related hazards of human spaceflight</h3>
          {hazards.map((h) => (
            <details key={h.id} className="rounded-md border border-line px-3 py-2">
              <summary className="cursor-pointer font-medium">{h.name}</summary>
              <div className="mt-3">
                <SourcedList statements={h.nasa} />
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Related NASA open-science studies</h3>
        <p className="text-sm text-muted">
          Keyword search results from NASA's Open Science Data Repository. Relevance is loose, and many studies are
          on animals or on the ground. They are research studies, not astronaut health data.
        </p>
        {STUDY_TOPICS[region.id].map(({ term, topic }) => (
          <RelatedStudies key={term} term={term} topic={topic} />
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <h3 className="font-semibold">Why we track this</h3>
        <p>{region.team}</p>
        <p className="text-xs text-muted">Our team's design rationale, not a NASA statement.</p>
      </div>
    </section>
  )
}
