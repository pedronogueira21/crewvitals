import type { ReactNode } from 'react'
import DataModeTag from '../components/DataModeTag'
import SourcedList from '../components/SourcedList'
import { ESCALATION, SOURCES } from '../content/evidence'
import { REFERENCE_RANGE_LABEL } from '../content/indicators'
import { useRadiation, useSpaceWeather, useStudies } from '../lib/api'
import type { Loaded } from '../lib/api'
import { STUDY_KEYWORDS } from '../lib/nasa'
import type { Mode } from '../lib/nasa'
import { formatDate } from '../lib/mission'

const link = 'text-accent underline'

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
      {children}
    </a>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Live/Snapshot label for one data source, while loading or after. */
function ModeOf({ loaded }: { loaded: Loaded<unknown> }) {
  if (loaded.state === 'loading') return <p className="text-xs text-muted">Checking…</p>
  if (loaded.state === 'error') return <p className="text-xs text-muted">Unavailable right now</p>
  return <DataModeTag mode={loaded.result.mode} retrieved={loaded.result.retrieved} />
}

/** OSDR is fetched per keyword; the label summarizes all of them. */
function OsdrMode() {
  // STUDY_KEYWORDS is a constant list, so the hooks run in the same order every render.
  const all = STUDY_KEYWORDS.map((term) => ({ term, loaded: useStudies(term) }))
  if (all.some((k) => k.loaded.state === 'loading')) return <p className="text-xs text-muted">Checking…</p>
  const ready = all.flatMap((k) => (k.loaded.state === 'ready' ? [{ term: k.term, ...k.loaded.result }] : []))
  const modes = new Set<Mode>(ready.map((r) => r.mode))
  if (ready.length === all.length && modes.size === 1) {
    return <DataModeTag mode={ready[0].mode} retrieved={ready[0].retrieved} />
  }
  const live = ready.filter((r) => r.mode === 'live').map((r) => r.term)
  const snapshot = ready.filter((r) => r.mode === 'snapshot')
  return (
    <p className="text-xs text-muted">
      {live.length > 0 && `Live: ${live.join(', ')}. `}
      {snapshot.length > 0 &&
        `Snapshot — retrieved ${formatDate(snapshot[0].retrieved)}: ${snapshot.map((r) => r.term).join(', ')}. `}
      {ready.length < all.length && 'Some keywords are unavailable right now.'}
    </p>
  )
}

function DataSource({
  name,
  href,
  mode,
  children,
}: {
  name: string
  href: string
  mode: ReactNode
  children: ReactNode
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          <Ext href={href}>{name}</Ext>
        </h3>
        {mode}
      </div>
      <div className="text-sm text-muted">{children}</div>
    </li>
  )
}

export default function About() {
  const spaceWeather = useSpaceWeather()
  const radiation = useRadiation()

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold">About CrewVitals</h1>
        <p className="mt-2 text-muted">
          A health self-assessment app for astronauts on long-duration missions, built for the NASA Space Apps
          Challenge 2026 ("Create Health Monitoring Software for Astronauts on Space Missions").
        </p>
      </div>

      <Section id="disclaimer-heading" title="Not a medical device">
        <p className="rounded-lg border border-alert px-4 py-3 font-semibold">
          This is a hackathon prototype, not a medical device. Do not use it to make medical decisions.
        </p>
        <p>
          <span className="font-semibold">{REFERENCE_RANGE_LABEL}.</span> The green, yellow and red thresholds are
          terrestrial adult clinical reference ranges. They are not NASA flight rules and not limits defined for
          spaceflight. The guidance and self-care steps are general wellness text, drafted with AI assistance (see Use of AI below).
        </p>
        <p>
          Data loaded with "Load demo mission" is simulated crew data, and is labelled "Simulated crew data"
          wherever it appears.
        </p>
        <p>
          There is no login and no account. Your health entries stay in this browser (localStorage) and are never
          sent to a server. "Clear data" on the dashboard deletes them.
        </p>
        <p className="text-sm text-muted">
          CrewVitals is not affiliated with or endorsed by NASA. It uses public NASA data and pages, credited below.
        </p>
      </Section>

      <Section id="sources-heading" title="Data sources">
        <p className="text-sm text-muted">
          Each NASA data panel is labelled <span className="text-ok">Live</span> when the data was fetched from
          NASA just now, or "Snapshot — retrieved &lt;date&gt;" when it comes from a copy bundled with the app.
          The labels below show the mode right now.
        </p>
        <ul className="flex flex-col gap-3">
          <DataSource name="NASA CCMC DONKI" href="https://ccmc.gsfc.nasa.gov/DONKI/" mode={<ModeOf loaded={spaceWeather} />}>
            <p>Solar flares and solar energetic particle events of the last 7 days, for the space weather banner.</p>
            <p className="mt-1 text-ink">Space weather data: NASA CCMC DONKI.</p>
          </DataSource>
          <DataSource name="NASA OSDR (Open Science Data Repository)" href="https://osdr.nasa.gov/" mode={<OsdrMode />}>
            Study search results for a fixed keyword per indicator, shown in the body map as related open-science
            studies. Relevance is loose, many studies are on animals or on the ground, and none of them are
            astronaut health data.
          </DataSource>
          <DataSource name="NASA OSDR RadLab" href="https://visualization.osdr.nasa.gov/radlab/" mode={<ModeOf loaded={radiation} />}>
            Absorbed dose rate measured by the DosTel instruments aboard the ISS on one historical day
            {radiation.state === 'ready' && radiation.result.data.instruments[0]
              ? ` (${formatDate(radiation.result.data.instruments[0].first.slice(0, 10))})`
              : ''}
            , for the radiation panel. The cumulative dose shown is an illustration, not a personal dose record.
          </DataSource>
        </ul>

        <h3 className="mt-2 font-semibold">NASA pages behind the spaceflight context</h3>
        <p className="text-sm text-muted">
          The statements in the body map and below paraphrase these pages and are bundled with the app. They
          were drafted with Claude (see Use of AI below). Each statement links to its page.
        </p>
        <ul className="flex flex-col gap-1">
          {Object.values(SOURCES).map((s) => (
            <li key={s.url}>
              <Ext href={s.url}>{s.title}</Ext>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="escalation-heading" title="Medical care far from Earth">
        <p className="text-sm text-muted">Paraphrased from NASA sources.</p>
        <SourcedList statements={ESCALATION.nasa} />
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <h3 className="font-semibold">How the app escalates</h3>
          <p>{ESCALATION.team}</p>
          <p className="text-xs text-muted">
            Our team's design rationale, drafted with Claude. Not a NASA statement.
          </p>
        </div>
      </Section>

      <Section id="ai-heading" title="Use of AI">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Claude (Anthropic) was used to plan the project and write its specification.</li>
          <li>
            The app's code was written with Claude Code, Anthropic's AI coding assistant, and reviewed by our
            team.
          </li>
          <li>Claude drafted the interface text and the self-care steps.</li>
          <li>
            Claude drafted the paraphrases of NASA pages shown in the body map and on this page, working from the
            page linked beside each statement.
          </li>
          <li>
            Claude also drafted the team's design rationale texts ("Why we track this" in the body map and "How the
            app escalates" on this page). They are labelled as our rationale, not NASA statements.
          </li>
          <li>The body map figure is a schematic drawn in code with AI assistance.</li>
          <li>No images were generated with AI, and the app uses no NASA logos, insignia or mission patches.</li>
          <li>
            The app itself uses no AI: statuses, alerts and guidance come from fixed rules that the team can read
            and edit.
          </li>
        </ul>
      </Section>
    </div>
  )
}
