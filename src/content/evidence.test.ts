// evidence.json must fit what the body map renders (SPEC.md section 5).
import { describe, expect, it } from 'vitest'
import bodySvg from '../assets/body.svg?raw'
import { ESCALATION, HAZARDS, REGION_IDS, REGIONS, SOURCES } from './evidence'
import { INDICATOR_IDS } from './indicators'

describe('evidence.json', () => {
  const statements = [...REGIONS.flatMap((r) => r.nasa), ...HAZARDS.flatMap((h) => h.nasa)]

  it('has exactly the six body-map regions', () => {
    expect(REGIONS.map((r) => r.id).sort()).toEqual([...REGION_IDS].sort())
  })
  it('every NASA statement names a known source with a link', () => {
    for (const s of statements) {
      expect(SOURCES[s.source]?.url, s.text).toMatch(/^https:\/\//)
    }
  })
  it('every region names known indicators and hazards, and has team rationale', () => {
    const indicatorIds = INDICATOR_IDS as string[]
    const hazardIds = HAZARDS.map((h) => h.id)
    for (const r of REGIONS) {
      for (const id of r.indicators) expect(indicatorIds, r.id).toContain(id)
      for (const id of r.hazards) expect(hazardIds, r.id).toContain(id)
      expect(r.team.length, r.id).toBeGreaterThan(0)
    }
  })
  it('the escalation block has a sourced statement about the communication delay (Mars transit line)', () => {
    const delay = ESCALATION.nasa.find((s) => /communication/i.test(s.text))
    expect(delay && SOURCES[delay.source]?.url).toMatch(/^https:\/\//)
  })
  it('every English text has a Portuguese version beside it, with the same source key', () => {
    for (const s of [...statements, ...ESCALATION.nasa]) {
      expect(s.textPt, s.text).toBeTruthy()
      expect(s.textPt, s.text).not.toBe(s.text)
    }
    for (const r of REGIONS) expect(r.labelPt && r.teamPt, r.id).toBeTruthy()
    for (const h of HAZARDS) expect(h.namePt, h.id).toBeTruthy()
    expect(ESCALATION.teamPt).toBeTruthy()
  })
  it('every indicator appears in exactly one region', () => {
    const used = REGIONS.flatMap((r) => r.indicators).sort()
    expect(used).toEqual([...INDICATOR_IDS].sort())
  })
})

describe('body.svg', () => {
  it('has an element for every region id', () => {
    for (const id of REGION_IDS) expect(bodySvg, id).toMatch(new RegExp(`id="${id}"`))
  })
})
