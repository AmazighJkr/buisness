import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/command', label: 'Command' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-theme-border bg-theme-bg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="text-sm font-semibold tracking-wide text-theme-fg hover:opacity-80">
          IoT Lab
        </Link>

        <nav className="flex items-center gap-4">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-theme-fg underline underline-offset-4' : 'text-theme-muted hover:text-theme-fg'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
