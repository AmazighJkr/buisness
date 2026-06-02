import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import NavAccount from './NavAccount.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { NAV_LAB } from '../config/siteNav.js'

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
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
        <button type="button" onClick={() => scrollTo('home')} className="site-logo shrink-0">
          Embedded<span>Grid</span>
        </button>

        <nav className="site-nav-desktop" aria-label="Landing sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`site-nav-link ${active === s.id ? 'site-nav-link-active' : ''}`}
            >
              {s.label}
            </button>
          ))}
          <span className="site-nav-divider" aria-hidden />
          {NAV_LAB.map(({ to, label }) => (
            <Link key={to} to={to} className="site-nav-link">
              {label}
            </Link>
          ))}
        </nav>

        <div className="site-header-actions">
          <Link to="/shop" className="store-entry-btn">
            Store
          </Link>
          <ThemeToggle compact />
          <NavAccount />
          <div className="site-nav-mobile">
            <button
              type="button"
              className="theme-toggle-btn site-nav-mobile-toggle"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="nav-scrim fixed inset-0 top-[3.25rem] z-40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative z-50 max-h-[calc(100vh-3.25rem)] overflow-y-auto border-b border-dark-border bg-dark-panel px-4 py-3 shadow-[var(--eg-shadow)] lg:hidden">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">Sections</p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`mb-1 block w-full rounded-md px-3 py-2.5 text-left text-sm ${
                  active === s.id ? 'site-nav-drawer-link-active' : 'site-nav-drawer-link'
                }`}
              >
                {s.label}
              </button>
            ))}
            <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">Lab</p>
            {NAV_LAB.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="site-nav-drawer-link mb-1 block rounded-md px-3 py-2.5 text-sm"
              >
                {label}
              </Link>
            ))}
            <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">Store</p>
            <Link
              to="/shop"
              onClick={() => setMenuOpen(false)}
              className="site-nav-drawer-link site-nav-drawer-link--store mb-1 block rounded-md px-3 py-2.5 text-sm"
            >
              Open store
            </Link>
            <Link
              to="/account"
              onClick={() => setMenuOpen(false)}
              className="site-nav-drawer-link mb-1 block rounded-md px-3 py-2.5 text-sm"
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
