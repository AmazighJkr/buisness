import { createContext, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { NAV_LAB, navLinkActive } from '../config/siteNav.js'

const SiteNavContext = createContext(null)

function useSiteNav() {
  const ctx = useContext(SiteNavContext)
  if (!ctx) throw new Error('SiteNav parts must be used inside <SiteNav>')
  return ctx
}

export function SiteNavProvider({ highlight = '', children }) {
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

  const isActive = (to) => navLinkActive(highlight, to)

  return (
    <SiteNavContext.Provider value={{ highlight, open, setOpen, isActive }}>
      {children}
    </SiteNavContext.Provider>
  )
}

function NavLink({ to, label }) {
  const { isActive } = useSiteNav()
  return (
    <Link to={to} className={`site-nav-link ${isActive(to) ? 'site-nav-link-active' : ''}`}>
      {label}
    </Link>
  )
}

export function SiteNavDesktop() {
  return (
    <nav className="site-nav-desktop" aria-label="Lab navigation">
      {NAV_LAB.map(({ to, label }) => (
        <NavLink key={to} to={to} label={label} />
      ))}
    </nav>
  )
}

export function SiteNavMobile() {
  const { open, setOpen, isActive } = useSiteNav()

  return (
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
          <nav className="site-nav-drawer" aria-label="Mobile navigation">
            <p className="site-nav-drawer-heading">Lab</p>
            {NAV_LAB.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`site-nav-drawer-link ${isActive(to) ? 'site-nav-drawer-link-active' : ''}`}
              >
                {label}
              </Link>
            ))}
            <p className="site-nav-drawer-heading mt-3">Store</p>
            <Link
              to="/shop"
              onClick={() => setOpen(false)}
              className="site-nav-drawer-link site-nav-drawer-link--store"
            >
              Open store
            </Link>
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
  )
}

export default function SiteNav({ highlight = '' }) {
  return (
    <SiteNavProvider highlight={highlight}>
      <SiteNavDesktop />
      <SiteNavMobile />
    </SiteNavProvider>
  )
}
