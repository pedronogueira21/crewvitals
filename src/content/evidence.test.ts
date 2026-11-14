// evidence.json must fit what the body map renders (SPEC.md section 5).
import { describe, expect, it } from 'vitest'
import bodySvg from '../assets/body.svg?raw'
import { HAZARDS, REGION_IDS, REGIONS, SOURCES } from './evidence'
import { INDICATORS } from './indicators'

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
    const indicatorIds = INDICATORS.map((i) => i.id) as string[]
    const hazardIds = HAZARDS.map((h) => h.id)
    for (const r of REGIONS) {
      for (const id of r.indicators) expect(indicatorIds, r.id).toContain(id)
      for (const id of r.hazards) expect(hazardIds, r.id).toContain(id)
      expect(r.team.length, r.id).toBeGreaterThan(0)
    }
  })
  it('every indicator appears in exactly one region', () => {
    const used = REGIONS.flatMap((r) => r.indicators).sort()
    expect(used).toEqual(INDICATORS.map((i) => i.id).sort())
  })
})

describe('body.svg', () => {
  it('has an element for every region id', () => {
    for (const id of REGION_IDS) expect(bodySvg, id).toMatch(new RegExp(`id="${id}"`))
  })
})
