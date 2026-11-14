const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(toUTC(value))
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Today's calendar date in the browser's time zone, as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Mission day 1 is the mission start date. */
export function missionDayOn(date: string, missionStart: string): number {
  return Math.round((toUTC(date) - toUTC(missionStart)) / 86_400_000) + 1
}

export function formatDate(iso: string): string {
  return new Date(toUTC(iso)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
