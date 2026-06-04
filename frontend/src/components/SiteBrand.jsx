import { Link } from 'react-router-dom'

/**
 * Header logo — always links to the section home.
 * landing: EmbeddedGrid → / · lab: /projects · store: StoreGrid → /shop
 */
export default function SiteBrand({ variant = 'lab', className = '' }) {
  const isStore = variant === 'store'
  const to = isStore ? '/shop' : variant === 'landing' ? '/' : '/projects'
  const prefix = isStore ? 'Store' : 'Embedded'
  const aria = isStore ? 'StoreGrid home' : variant === 'landing' ? 'EmbeddedGrid home' : 'EmbeddedGrid projects'

  return (
    <Link
      to={to}
      className={`site-logo site-header-brand ${className}`.trim()}
      aria-label={aria}
    >
      {prefix}
      <span>Grid</span>
    </Link>
  )
}
