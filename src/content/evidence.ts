// Typed access to evidence.json (SPEC.md section 5). The JSON is curated by the
// team: render its text as written, never rewrite or extend it.
//
// Each English text has a Portuguese version beside it (textPt, labelPt,
// namePt, teamPt), drafted with Claude. The Portuguese NASA statements are a
// translation of the team's English paraphrase, and are labelled that way.
import raw from './evidence.json'
import type { Lang } from '../i18n/format'
import type { IndicatorId } from './indicators'

export const REGION_IDS = ['head', 'heart', 'abdomen', 'core', 'bones', 'whole-body'] as const
export type RegionId = (typeof REGION_IDS)[number]

export type Source = { title: string; url: string }
/** `source` is a key of `sources` in evidence.json. */
export type Statement = { text: string; textPt: string; source: string }

export type Hazard = { id: string; name: string; namePt: string; nasa: Statement[] }

export type Region = {
  id: RegionId
  label: string
  labelPt: string
  indicators: IndicatorId[]
  hazards: string[]
  nasa: Statement[]
  /** The team's rationale. Shown under "Why we track this", never attributed to NASA. */
  team: string
  teamPt: string
}

export const SOURCES: Record<string, Source> = raw.sources
export const HAZARDS: Hazard[] = raw.hazards
export const REGIONS = raw.regions as Region[]
/** Care far from Earth: NASA statements and the team's rationale for how the app escalates. */
export const ESCALATION: { nasa: Statement[]; team: string; teamPt: string } = raw.escalation

export function sourceOf(statement: Statement): Source | undefined {
  return SOURCES[statement.source]
}

const pick = (en: string, pt: string, lang: Lang) => (lang === 'pt-BR' ? pt : en)
export const statementText = (s: Statement, lang: Lang) => pick(s.text, s.textPt, lang)
export const regionLabel = (r: Region, lang: Lang) => pick(r.label, r.labelPt, lang)
export const hazardName = (h: Hazard, lang: Lang) => pick(h.name, h.namePt, lang)
export const teamText = (t: { team: string; teamPt: string }, lang: Lang) => pick(t.team, t.teamPt, lang)
