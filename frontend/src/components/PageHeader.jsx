import { Link } from 'react-router-dom'
import MobileSiteNav from './MobileSiteNav.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function PageHeader({ highlight = '' }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-logo">
          Embedded<span>Grid</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle compact />
          <MobileSiteNav highlight={highlight} />
        </div>
      </div>
    </header>
  )
}
