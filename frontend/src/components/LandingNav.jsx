import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import NavAccount from './NavAccount.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
]

const PAGE_LINKS = [
  { to: '/projects', label: 'Projects' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/command', label: 'Submit command' },
  { to: '/track', label: 'Track command' },
]

export default function LandingNav() {
  const [active, setActive] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 120
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id)
        if (el && el.offsetTop <= y) {
          setActive(s.id)
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="site-header fixed top-0 left-0 right-0 z-50">
      <div className="site-header-inner max-w-6xl">
        <button type="button" onClick={() => scrollTo('home')} className="site-logo">
          Embedded<span>Grid</span>
        </button>

        <nav className="hidden items-center gap-4 lg:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`text-sm transition-colors ${
                active === s.id
                  ? 'font-medium text-lab-cyan'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-dark-border" aria-hidden />
          {PAGE_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="text-sm text-dark-muted hover:text-dark-text">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <NavAccount />
          <button
            type="button"
            className="theme-toggle-btn lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="nav-scrim fixed inset-0 top-[53px] z-40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative z-50 max-h-[calc(100vh-53px)] overflow-y-auto border-b border-dark-border bg-dark-panel px-4 py-3 shadow-[var(--eg-shadow)] lg:hidden">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">Sections</p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`mb-1 block w-full rounded-md px-3 py-2.5 text-left text-sm ${
                  active === s.id
                    ? 'bg-[color-mix(in_srgb,var(--eg-accent)_14%,var(--eg-panel))] text-lab-cyan'
                    : 'text-dark-muted hover:bg-dark-border/40'
                }`}
              >
                {s.label}
              </button>
            ))}
            <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">Lab</p>
            {PAGE_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="mb-1 block rounded-md px-3 py-2.5 text-sm text-dark-muted hover:bg-dark-border/40 hover:text-dark-text"
              >
                {label}
              </Link>
            ))}
            <Link
              to="/account"
              onClick={() => setMenuOpen(false)}
              className="mb-1 block rounded-md px-3 py-2.5 text-sm text-dark-muted hover:bg-dark-border/40 hover:text-dark-text"
            >
              Account
            </Link>
            <div className="mt-4 border-t border-dark-border pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">Theme</p>
              <ThemeToggle />
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
