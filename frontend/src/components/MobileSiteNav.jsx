import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import NavAccount from './NavAccount.jsx'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/command', label: 'Submit command' },
  { to: '/track', label: 'Track' },
]

export default function MobileSiteNav({ highlight = '' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const linkClass = (active) =>
    active
      ? 'bg-[color-mix(in_srgb,var(--eg-accent)_14%,var(--eg-panel))] text-[var(--eg-accent)]'
      : 'text-dark-muted hover:bg-[color-mix(in_srgb,var(--eg-border)_50%,transparent)] hover:text-dark-text'

  return (
    <div className="flex shrink-0 items-center gap-2">
      <NavAccount />

      <div className="relative">
        <button
          type="button"
          className="theme-toggle-btn lg:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {open && (
          <>
            <button
              type="button"
              className="nav-scrim fixed inset-0 top-12 z-[55] lg:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <nav className="absolute right-0 top-full z-[70] mt-2 w-[min(92vw,15rem)] overflow-hidden rounded-lg border border-dark-border bg-dark-panel py-2 shadow-[var(--eg-shadow)] lg:hidden">
              {LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={`mx-2 block rounded-md px-3 py-2.5 text-sm ${linkClass(highlight === to)}`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className={`mx-2 mt-1 block rounded-md border-t border-dark-border px-3 py-2.5 text-sm ${linkClass(false)}`}
              >
                Account settings
              </Link>
            </nav>
          </>
        )}

        <nav className="hidden items-center gap-1 text-sm lg:flex xl:gap-2">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                highlight === to
                  ? 'font-medium text-lab-cyan'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
