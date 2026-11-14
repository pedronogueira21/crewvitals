// Typed access to evidence.json (SPEC.md section 5). The JSON is curated by the
// team: render its text as written, never rewrite or extend it.
import raw from './evidence.json'
import type { IndicatorId } from './indicators'

export const REGION_IDS = ['head', 'heart', 'abdomen', 'core', 'bones', 'whole-body'] as const
export type RegionId = (typeof REGION_IDS)[number]

export type Source = { title: string; url: string }
/** `source` is a key of `sources` in evidence.json. */
export type Statement = { text: string; source: string }

export type Hazard = { id: string; name: string; nasa: Statement[] }

export type Region = {
  id: RegionId
  label: string
  indicators: IndicatorId[]
  hazards: string[]
  nasa: Statement[]
  /** The team's rationale. Shown under "Why we track this", never attributed to NASA. */
  team: string
}

export const SOURCES: Record<string, Source> = raw.sources
export const HAZARDS: Hazard[] = raw.hazards
export const REGIONS = raw.regions as Region[]

export function sourceOf(statement: Statement): Source | undefined {
  return SOURCES[statement.source]
}

/** Care far from Earth: NASA statements and the team's rationale for how the app escalates. */
export const ESCALATION: { nasa: Statement[]; team: string } = raw.escalation
