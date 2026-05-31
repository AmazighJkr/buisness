import { Link } from 'react-router-dom'
import NavAccount from './NavAccount.jsx'
import SiteNav from './SiteNav.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function PageHeader({ highlight = '', beforeLogo = null }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {beforeLogo}
          <Link to="/" className="site-logo">
            Embedded<span>Grid</span>
          </Link>
        </div>

        <SiteNav highlight={highlight} />

        <div className="site-header-actions">
          <ThemeToggle compact />
          <NavAccount />
        </div>
      </div>
    </header>
  )
}
