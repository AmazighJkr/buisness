import { Link } from 'react-router-dom'
import NavAccount from './NavAccount.jsx'
import { SiteNavDesktop, SiteNavMobile, SiteNavProvider } from './SiteNav.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function PageHeader({ highlight = '', headerStart = null, beforeLogo = null }) {
  const leading = headerStart ?? beforeLogo

  return (
    <SiteNavProvider highlight={highlight}>
      <header className="site-header">
        <div className={`site-header-inner${leading ? ' site-header-inner--with-leading' : ''}`}>
          {leading ? <div className="site-header-leading">{leading}</div> : null}

          <Link to="/" className="site-logo site-header-brand">
            Embedded<span>Grid</span>
          </Link>

          <SiteNavDesktop />

          <div className="site-header-actions">
            <ThemeToggle compact />
            <NavAccount />
            <SiteNavMobile />
          </div>
        </div>
      </header>
    </SiteNavProvider>
  )
}
