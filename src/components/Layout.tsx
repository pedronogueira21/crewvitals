import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/check-in': 'Daily check-in',
  '/trends': 'Trends',
  '/body-map': 'Body map',
  '/about': 'About',
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
  }`

export default function Layout() {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // Each screen gets its own title. After navigating, focus moves to the main
  // content so keyboard and screen reader users start on the new screen.
  useEffect(() => {
    document.title = `${TITLES[pathname] ?? 'Dashboard'} · CrewVitals`
    if (firstRender.current) firstRender.current = false
    else main.current?.focus()
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-space focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-10"
      >
        Skip to main content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-4">
        <p className="font-display text-xl font-semibold tracking-wide">CrewVitals</p>
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          <NavLink to="/" end className={navLink}>
            Dashboard
          </NavLink>
          <NavLink to="/check-in" className={navLink}>
            Daily check-in
          </NavLink>
          <NavLink to="/trends" className={navLink}>
            Trends
          </NavLink>
          <NavLink to="/body-map" className={navLink}>
            Body map
          </NavLink>
          <NavLink to="/about" className={navLink}>
            About
          </NavLink>
        </nav>
      </header>

      <main id="main" ref={main} tabIndex={-1} className="flex-1 py-6 outline-none sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-5 text-sm text-muted">
        <p className="text-ink">This is a hackathon prototype, not a medical device.</p>
        <p className="mt-1">
          Your health entries stay in this browser. Nothing you enter is sent to a server.
        </p>
        <p className="mt-1">
          <Link to="/about" className="text-accent underline">
            About, data sources and AI use
          </Link>
        </p>
      </footer>
    </div>
  )
}
