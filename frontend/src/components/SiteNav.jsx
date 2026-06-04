import { createContext, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { NAV_LAB, navLinkActive } from '../config/siteNav.js'

const SiteNavContext = createContext(null)

function useSiteNav() {
  const ctx = useContext(SiteNavContext)
  if (!ctx) throw new Error('SiteNav parts must be used inside <SiteNav>')
  return ctx
}

export function SiteNavProvider({ highlight = '', children }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

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
    <SiteNavContext.Provider value={{ highlight, open, setOpen, isActive, t }}>
      {children}
    </SiteNavContext.Provider>
  )
}

function NavLink({ to, labelKey }) {
  const { isActive, t } = useSiteNav()
  return (
    <Link to={to} className={`site-nav-link ${isActive(to) ? 'site-nav-link-active' : ''}`}>
      {t(labelKey)}
    </Link>
  )
}

export function SiteNavDesktop() {
  return (
    <nav className="site-nav-desktop" aria-label="Lab navigation">
      {NAV_LAB.map(({ to, labelKey }) => (
        <NavLink key={to} to={to} labelKey={labelKey} />
      ))}
    </nav>
  )
}

export function SiteNavMobile() {
  const { open, setOpen, isActive, t } = useSiteNav()
  const { storeVisible } = useStoreRegion()

  return (
    <div className="site-nav-mobile">
      <button
        type="button"
        className="theme-toggle-btn site-nav-mobile-toggle"
        aria-expanded={open}
        aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="nav-scrim site-nav-scrim"
            aria-label={t('nav.closeMenu')}
            onClick={() => setOpen(false)}
          />
          <nav className="site-nav-drawer" aria-label="Mobile navigation">
            <p className="site-nav-drawer-heading">{t('nav.lab')}</p>
            {NAV_LAB.map(({ to, labelKey }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`site-nav-drawer-link ${isActive(to) ? 'site-nav-drawer-link-active' : ''}`}
              >
                {t(labelKey)}
              </Link>
            ))}
            {storeVisible && (
              <>
                <p className="site-nav-drawer-heading mt-3">{t('nav.store')}</p>
                <Link
                  to="/shop"
                  onClick={() => setOpen(false)}
                  className="site-nav-drawer-link site-nav-drawer-link--store"
                >
                  {t('nav.openStore')}
                </Link>
              </>
            )}
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="site-nav-drawer-link mt-1 border-t border-dark-border pt-3"
            >
              {t('nav.account')}
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
