import { OctagonAlert } from 'lucide-react'
import { useLang } from '../i18n/LangProvider'

export default function UrgentNotice() {
  const { c } = useLang()
  return (
    <p className="flex items-start gap-2 rounded-md bg-alert px-3 py-2 font-semibold text-space">
      <OctagonAlert aria-hidden="true" size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
      {c.urgent}
    </p>
  )
}
