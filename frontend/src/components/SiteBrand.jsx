import { Link } from 'react-router-dom'

/**
 * Header logo — section home link.
 * landing & lab: EmbeddedGrid → / · store: StoreGrid → /shop
 */
export default function SiteBrand({ variant = 'lab', className = '' }) {
  const isStore = variant === 'store'
  const to = isStore ? '/store' : '/'
  const prefix = isStore ? 'Store' : 'Embedded'
  const aria = isStore ? 'StoreGrid home' : 'EmbeddedGrid home'

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
