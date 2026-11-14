import { CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Status } from '../content/indicators'

// Each status has its own icon shape, text label and colour.
export const STATUS_UI: Record<
  Status,
  { label: string; Icon: LucideIcon; text: string; border: string; zone: string }
> = {
  green: { label: 'Green', Icon: CircleCheck, text: 'text-ok', border: 'border-l-ok', zone: 'zone-green' },
  yellow: { label: 'Yellow', Icon: TriangleAlert, text: 'text-warn', border: 'border-l-warn', zone: 'zone-yellow' },
  red: { label: 'Red', Icon: OctagonAlert, text: 'text-alert', border: 'border-l-alert', zone: 'zone-red' },
}

export default function StatusBadge({ status, large = false }: { status: Status; large?: boolean }) {
  const { label, Icon, text } = STATUS_UI[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${text} ${large ? 'text-xl' : 'text-sm'}`}
    >
      <Icon aria-hidden="true" size={large ? 24 : 18} strokeWidth={2.25} />
      <span>
        <span className="sr-only">Status: </span>
        {label}
      </span>
    </span>
  )
}
