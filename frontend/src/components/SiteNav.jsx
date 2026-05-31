import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/command', label: 'Submit command' },
  { to: '/track', label: 'Track' },
]

export default function SiteNav({ highlight = '' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [highlight])

  const isActive = (to) => {
    if (to === '/') return highlight === '/' || highlight === ''
    return highlight === to
  }

  return (
    <>
      <nav className="site-nav-desktop" aria-label="Main navigation">
        {LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`site-nav-link ${isActive(to) ? 'site-nav-link-active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="site-nav-mobile">
        <button
          type="button"
          className="theme-toggle-btn site-nav-mobile-toggle"
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
              className="nav-scrim site-nav-scrim"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <nav
              className="site-nav-drawer"
              aria-label="Mobile navigation"
            >
              {LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={`site-nav-drawer-link ${isActive(to) ? 'site-nav-drawer-link-active' : ''}`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="site-nav-drawer-link mt-1 border-t border-dark-border pt-3"
              >
                Account
              </Link>
            </nav>
          </>
        )}
      </div>
    </>
  )
}
