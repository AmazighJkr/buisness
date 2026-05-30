import { Link } from 'react-router-dom'
import MobileSiteNav from './MobileSiteNav.jsx'

export default function PageHeader({ highlight = '' }) {
  return (
    <header className="sticky top-0 z-40 border-b border-dark-border bg-dark-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link to="/" className="truncate text-sm font-semibold tracking-wide">
          EmbeddedGrid
        </Link>
        <MobileSiteNav highlight={highlight} />
      </div>
    </header>
  )
}
