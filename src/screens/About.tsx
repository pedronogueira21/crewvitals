import type { ReactNode } from 'react'
import DataModeTag from '../components/DataModeTag'
import { ModesTag } from '../components/RadiationPanel'
import SourcedList from '../components/SourcedList'
import { ESCALATION, SOURCES, teamText } from '../content/evidence'
import { useLang } from '../i18n/LangProvider'
import { useRadiation, useSpaceWeather, useStudies } from '../lib/api'
import type { Loaded } from '../lib/api'
import { RADIATION_ENVIRONMENTS, RADLAB_DAY, STUDY_KEYWORDS } from '../lib/nasa'
import type { Mode } from '../lib/nasa'

const link = 'text-accent underline'

function Ext({ href, children, lang }: { href: string; children: ReactNode; lang?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" lang={lang} className={link}>
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
  const { t } = useLang()
  if (loaded.state === 'loading') return <p className="text-xs text-muted">{t.mode.checking}</p>
  if (loaded.state === 'error') return <p className="text-xs text-muted">{t.mode.unavailable}</p>
  return <DataModeTag mode={loaded.result.mode} retrieved={loaded.result.retrieved} />
}

/** OSDR is fetched per keyword; the label summarizes all of them. */
function OsdrMode() {
  const { t, date } = useLang()
  // STUDY_KEYWORDS is a constant list, so the hooks run in the same order every render.
  const all = STUDY_KEYWORDS.map((term) => ({ term, loaded: useStudies(term) }))
  if (all.some((k) => k.loaded.state === 'loading')) return <p className="text-xs text-muted">{t.mode.checking}</p>
  const ready = all.flatMap((k) => (k.loaded.state === 'ready' ? [{ term: k.term, ...k.loaded.result }] : []))
  const modes = new Set<Mode>(ready.map((r) => r.mode))
  if (ready.length === all.length && modes.size === 1) {
    return <DataModeTag mode={ready[0].mode} retrieved={ready[0].retrieved} />
  }
  const live = ready.filter((r) => r.mode === 'live').map((r) => r.term)
  const snapshot = ready.filter((r) => r.mode === 'snapshot')
  return (
    <p className="text-xs text-muted">
      {live.length > 0 && t.about.osdrLive(live.join(', '))}
      {snapshot.length > 0 && t.about.osdrSnapshot(date(snapshot[0].retrieved), snapshot.map((r) => r.term).join(', '))}
      {ready.length < all.length && t.about.osdrMissing}
    </p>
  )
}

function DataSource({ name, href, mode, children }: { name: string; href: string; mode: ReactNode; children: ReactNode }) {
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
  const { t, c, lang, date } = useLang()
  const spaceWeather = useSpaceWeather()
  // RADIATION_ENVIRONMENTS is a constant list, so the hooks run in the same order every render.
  const radiation = RADIATION_ENVIRONMENTS.map((env) => useRadiation(env.id))
  const a = t.about

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold">{a.title}</h1>
        <p className="mt-2 text-muted">{a.intro}</p>
      </div>

      <Section id="disclaimer-heading" title={a.disclaimerHeading}>
        <p className="rounded-lg border border-alert px-4 py-3 font-semibold">{a.disclaimer}</p>
        <p>
          <span className="font-semibold">{c.referenceRangeLabel}.</span> {a.thresholds}
        </p>
        <p>{a.simulated}</p>
        <p>{a.privacy}</p>
        <p className="text-sm text-muted">{a.notAffiliated}</p>
      </Section>

      <Section id="sources-heading" title={a.sourcesHeading}>
        <p className="text-sm text-muted">
          {a.modesBefore}
          <span className="text-ok">{t.mode.live}</span>
          {a.modesAfter}
        </p>
        <ul className="flex flex-col gap-3">
          <DataSource name="NASA CCMC DONKI" href="https://ccmc.gsfc.nasa.gov/DONKI/" mode={<ModeOf loaded={spaceWeather} />}>
            <p>{a.donki}</p>
            <p className="mt-1 text-ink">{a.donkiCredit}</p>
          </DataSource>
          <DataSource name="NASA OSDR (Open Science Data Repository)" href="https://osdr.nasa.gov/" mode={<OsdrMode />}>
            {a.osdr}
          </DataSource>
          <DataSource name="NASA OSDR RadLab" href="https://visualization.osdr.nasa.gov/radlab/" mode={<ModesTag all={radiation} />}>
            {a.radlab(date(RADLAB_DAY))}
          </DataSource>
        </ul>

        <h3 className="mt-2 font-semibold">{a.pagesHeading}</h3>
        <p className="text-sm text-muted">{a.pages}</p>
        <ul className="flex flex-col gap-1">
          {Object.values(SOURCES).map((s) => (
            <li key={s.url}>
              <Ext href={s.url} lang="en">
                {s.title}
              </Ext>
              {t.nasaText.sourceSuffix}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="escalation-heading" title={a.escalationHeading}>
        <p className="text-sm text-muted">{t.nasaText.listLabel}</p>
        <SourcedList statements={ESCALATION.nasa} />
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <h3 className="font-semibold">{a.howEscalates}</h3>
          <p>{teamText(ESCALATION, lang)}</p>
          <p className="text-xs text-muted">{t.nasaText.teamRationale}</p>
        </div>
      </Section>

      <Section id="ai-heading" title={a.aiHeading}>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {a.ai.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
