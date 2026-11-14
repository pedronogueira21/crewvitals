import { CircleDashed, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import bodySvg from '../assets/body.svg?raw'
import type { Status } from '../content/indicators'
import type { RegionId } from '../content/evidence'
import { STATUS_UI } from './StatusBadge'

/** What a region shows: a status, "not logged", or "information only". */
export type RegionState = Status | 'none' | 'info'

export const REGION_STATE_UI: Record<RegionState, { label: string; Icon: LucideIcon; text: string }> = {
  ...STATUS_UI,
  none: { label: 'Not logged', Icon: CircleDashed, text: 'text-muted' },
  info: { label: 'Information only', Icon: Info, text: 'text-accent' },
}

type Marker = { id: RegionId; x: number; y: number }

/**
 * Renders src/assets/body.svg as is and turns the elements with the region ids
 * into keyboard-accessible buttons. Regions missing from the SVG are offered as
 * plain buttons below it, so a new drawing can never hide a region.
 */
export default function BodyFigure({
  regions,
  selected,
  onSelect,
}: {
  regions: { id: RegionId; label: string; state: RegionState }[]
  selected: RegionId
  onSelect: (id: RegionId) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [layer, setLayer] = useState<SVGGElement | null>(null)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [missing, setMissing] = useState<RegionId[]>([])

  // Once: find the regions, make them focusable, place the status markers.
  useLayoutEffect(() => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    svg.setAttribute('role', 'group')
    svg.setAttribute('aria-label', 'Body map')
    svg.removeAttribute('width')
    svg.removeAttribute('height')

    const found: Marker[] = []
    const absent: RegionId[] = []
    for (const { id } of regions) {
      const el = svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`)
      if (!el) {
        absent.push(id)
        continue
      }
      el.setAttribute('data-region', id)
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      const box = el.getBBox()
      const x = Number(el.dataset.markerX ?? box.x + box.width / 2)
      const y = Number(el.dataset.markerY ?? box.y + box.height / 2)
      found.push({ id, x, y })
    }
    if (absent.length) console.warn(`body.svg has no element with id: ${absent.join(', ')}`)

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('pointer-events', 'none')
    g.setAttribute('aria-hidden', 'true')
    svg.appendChild(g)
    setLayer(g)
    setMarkers(found)
    setMissing(absent)
    return () => g.remove()
    // Runs once: the region ids are fixed and the SVG markup never changes.
  }, [])

  // Every render: status, label and selection on each region element.
  useEffect(() => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    for (const { id, label, state } of regions) {
      const el = svg.querySelector(`[data-region="${id}"]`)
      if (!el) continue
      el.setAttribute('data-status', state)
      el.setAttribute('aria-label', `${label}: ${REGION_STATE_UI[state].label}`)
      el.setAttribute('aria-pressed', String(id === selected))
    }
  })

  const regionAt = (target: EventTarget) =>
    (target as Element).closest?.('[data-region]')?.getAttribute('data-region') as RegionId | undefined

  const onClick = (e: MouseEvent) => {
    const id = regionAt(e.target)
    if (id) onSelect(id)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const id = regionAt(e.target)
    if (!id) return
    e.preventDefault()
    onSelect(id)
  }

  const stateOf = (id: RegionId) => regions.find((r) => r.id === id)!.state

  return (
    <div className="flex flex-col gap-3">
      {/* Click and key handlers delegate to the SVG region elements, which have role="button". */}
      <div
        ref={ref}
        className="body-map"
        onClick={onClick}
        onKeyDown={onKeyDown}
        dangerouslySetInnerHTML={{ __html: bodySvg }}
      />
      {layer &&
        createPortal(
          markers.map(({ id, x, y }) => {
            const { Icon, text } = REGION_STATE_UI[stateOf(id)]
            return (
              <g key={id} className={text}>
                <circle cx={x} cy={y} r={11} fill="var(--color-space)" />
                <Icon x={x - 8} y={y - 8} size={16} strokeWidth={2.5} />
              </g>
            )
          }),
          layer,
        )}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missing.map((id) => {
            const region = regions.find((r) => r.id === id)!
            return (
              <button
                key={id}
                type="button"
                aria-pressed={id === selected}
                onClick={() => onSelect(id)}
                className="rounded-md border border-control px-3 py-1.5 text-sm aria-pressed:bg-raised"
              >
                {region.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
