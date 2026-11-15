// Languages and number/date formatting. No React here, so content code and
// tests can use it too.

export type Lang = 'en' | 'pt-BR'
export const LANGS: Lang[] = ['en', 'pt-BR']

const LOCALE: Record<Lang, string> = { en: 'en-GB', 'pt-BR': 'pt-BR' }

/** A number with a fixed count of decimals: "36.7" in English, "36,7" in Portuguese. */
export function num(value: number, lang: Lang, decimals = 0, grouping = true): string {
  return value.toLocaleString(LOCALE[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  })
}

const utcMs = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** A calendar date (YYYY-MM-DD): "14 Nov 2026" in English, "14/11/2026" in Brazilian Portuguese. */
export function formatDate(iso: string, lang: Lang): string {
  const options: Intl.DateTimeFormatOptions =
    lang === 'pt-BR'
      ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }
  return new Date(utcMs(iso)).toLocaleDateString(LOCALE[lang], options)
}

/** An ISO time that ends in Z, shown in UTC with a 24-hour clock. */
export function formatUtc(iso: string, lang: Lang): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const time = d.toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
  return `${formatDate(d.toISOString(), lang)}, ${time} UTC`
}
