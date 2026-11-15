import { CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Status } from '../content/indicators'
import { useLang } from '../i18n/LangProvider'

// Each status has its own icon shape, text label and colour. Labels come from the dictionary (t.status).
export const STATUS_UI: Record<Status, { Icon: LucideIcon; text: string; border: string; zone: string }> = {
  green: { Icon: CircleCheck, text: 'text-ok', border: 'border-l-ok', zone: 'zone-green' },
  yellow: { Icon: TriangleAlert, text: 'text-warn', border: 'border-l-warn', zone: 'zone-yellow' },
  red: { Icon: OctagonAlert, text: 'text-alert', border: 'border-l-alert', zone: 'zone-red' },
}

export default function StatusBadge({ status, large = false }: { status: Status; large?: boolean }) {
  const { t } = useLang()
  const { Icon, text } = STATUS_UI[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${text} ${large ? 'text-xl' : 'text-sm'}`}
    >
      <Icon aria-hidden="true" size={large ? 24 : 18} strokeWidth={2.25} />
      <span>
        <span className="sr-only">{t.status.prefix}</span>
        {t.status[status]}
      </span>
    </span>
  )
}
