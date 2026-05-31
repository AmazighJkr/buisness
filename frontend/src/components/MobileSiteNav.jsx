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

  return (
    <div className="flex shrink-0 items-center gap-2">
      <NavAccount />

      <div className="relative">
        <button
          type="button"
          className="rounded border border-dark-border p-2 text-dark-muted hover:text-dark-text lg:hidden"
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
              className="fixed inset-0 top-12 z-[55] bg-neutral-900/25 lg:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <nav className="absolute right-0 top-full z-[70] mt-2 w-[min(92vw,14rem)] rounded border border-dark-border bg-dark-panel py-2 shadow-xl lg:hidden">
              {LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 text-sm ${
                    highlight === to
                      ? 'bg-dark-border/60 text-dark-text'
                      : 'text-dark-muted hover:bg-dark-border/40 hover:text-dark-text'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="block border-t border-dark-border px-4 py-2.5 text-sm text-dark-muted hover:bg-dark-border/40 hover:text-dark-text"
              >
                Account settings
              </Link>
            </nav>
          </>
        )}

        <nav className="hidden items-center gap-2 text-sm lg:flex xl:gap-3">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={
                highlight === to
                  ? 'text-dark-text'
                  : 'text-dark-muted hover:text-dark-text'
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
