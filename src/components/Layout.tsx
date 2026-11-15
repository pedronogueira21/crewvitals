import { Languages } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import type { Lang } from '../i18n/format'
import { useLang } from '../i18n/LangProvider'
import type { Dict } from '../i18n/ui'

const TITLE_KEYS: Record<string, keyof Dict['nav']> = {
  '/': 'dashboard',
  '/check-in': 'checkIn',
  '/trends': 'trends',
  '/body-map': 'bodyMap',
  '/about': 'about',
}

/** Each language is named in that language, as language pickers usually do. */
const LANGUAGE_NAMES: Record<Lang, string> = { en: 'English', 'pt-BR': 'Português (Brasil)' }

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
  }`

function LanguageSelect() {
  const { lang, setLang, t } = useLang()
  return (
    <label className="flex items-center gap-1.5 text-sm text-muted">
      <Languages aria-hidden="true" size={16} strokeWidth={2} />
      <span className="sr-only">{t.language.label}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-md border border-control bg-space px-2 py-1 text-ink"
      >
        {(Object.keys(LANGUAGE_NAMES) as Lang[]).map((l) => (
          <option key={l} value={l} lang={l}>
            {LANGUAGE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Layout() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // Each screen gets its own title, in the chosen language.
  useEffect(() => {
    document.title = `${t.nav[TITLE_KEYS[pathname] ?? 'dashboard']} · CrewVitals`
  }, [pathname, t])

  // After navigating, focus moves to the main content so keyboard and screen
  // reader users start on the new screen.
  useEffect(() => {
    if (firstRender.current) firstRender.current = false
    else main.current?.focus()
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-space focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-10"
      >
        {t.skipToMain}
      </a>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-4">
        <div className="flex items-center gap-4">
          <p className="font-display text-xl font-semibold tracking-wide">CrewVitals</p>
          <LanguageSelect />
        </div>
        <nav aria-label={t.nav.label} className="flex flex-wrap gap-1">
          <NavLink to="/" end className={navLink}>
            {t.nav.dashboard}
          </NavLink>
          <NavLink to="/check-in" className={navLink}>
            {t.nav.checkIn}
          </NavLink>
          <NavLink to="/trends" className={navLink}>
            {t.nav.trends}
          </NavLink>
          <NavLink to="/body-map" className={navLink}>
            {t.nav.bodyMap}
          </NavLink>
          <NavLink to="/about" className={navLink}>
            {t.nav.about}
          </NavLink>
        </nav>
      </header>

      <main id="main" ref={main} tabIndex={-1} className="flex-1 py-6 outline-none sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-5 text-sm text-muted">
        <p className="text-ink">{t.footer.disclaimer}</p>
        <p className="mt-1">{t.footer.privacy}</p>
        <p className="mt-1">
          <Link to="/about" className="text-accent underline">
            {t.footer.aboutLink}
          </Link>
        </p>
      </footer>
    </div>
  )
}
