import { useLang } from '../i18n/LangProvider'
import type { Mode } from '../lib/nasa'

/** Every NASA data panel shows this: "Live", or "Snapshot — retrieved <date>". */
export default function DataModeTag({ mode, retrieved }: { mode: Mode; retrieved: string }) {
  const { t, date } = useLang()
  return (
    <p
      className={`self-start rounded-sm border px-2 py-0.5 text-xs ${
        mode === 'live' ? 'border-ok text-ok' : 'border-line text-muted'
      }`}
    >
      {mode === 'live' ? t.mode.live : t.mode.snapshot(date(retrieved))}
    </p>
  )
}
