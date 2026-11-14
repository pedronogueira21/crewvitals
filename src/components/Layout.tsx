import { NavLink, Outlet } from 'react-router'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
  }`

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-4">
        <p className="font-display text-xl font-semibold tracking-wide">CrewVitals</p>
        <nav aria-label="Main" className="flex gap-1">
          <NavLink to="/" end className={navLink}>
            Dashboard
          </NavLink>
          <NavLink to="/check-in" className={navLink}>
            Daily check-in
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-5 text-sm text-muted">
        <p className="text-ink">This is a hackathon prototype, not a medical device.</p>
        <p className="mt-1">
          Your health entries stay in this browser. Nothing you enter is sent to a server.
        </p>
      </footer>
    </div>
  )
}
