import type { Mode } from '../lib/nasa'
import { formatDate } from '../lib/mission'

/** Every NASA data panel shows this: "Live", or "Snapshot — retrieved <date>". */
export default function DataModeTag({ mode, retrieved }: { mode: Mode; retrieved: string }) {
  return (
    <p
      className={`self-start rounded-sm border px-2 py-0.5 text-xs ${
        mode === 'live' ? 'border-ok text-ok' : 'border-line text-muted'
      }`}
    >
      {mode === 'live' ? 'Live' : `Snapshot — retrieved ${formatDate(retrieved)}`}
    </p>
  )
}

/** DONKI times end in Z (UTC). */
export function formatUtc(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`
}
