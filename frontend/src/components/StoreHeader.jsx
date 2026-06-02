import { Link } from 'react-router-dom'
import NavAccount from './NavAccount.jsx'
import NavCart from './NavCart.jsx'
import StoreSearchBar from './store/StoreSearchBar.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { NAV_STORE, navLinkActive } from '../config/siteNav.js'

/**
 * Store-only header — not mixed with Projects / Subscriptions.
 */
export default function StoreHeader({
  highlight = '/shop',
  headerStart = null,
  searchValue = '',
  onSearchChange = null,
}) {
  const isActive = (to) => navLinkActive(highlight, to)

  return (
    <header className="store-header site-header">
      <div className={`store-header__inner site-header-inner${headerStart ? ' site-header-inner--with-leading' : ''}`}>
        {headerStart ? <div className="site-header-leading">{headerStart}</div> : null}

        <Link to="/shop" className="site-logo store-header__logo">
          Store<span>Grid</span>
        </Link>

        <nav className="store-header__nav" aria-label="Store navigation">
          {NAV_STORE.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`site-nav-link ${isActive(to) ? 'site-nav-link-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {onSearchChange && (
          <div className="store-header__search hidden min-w-0 flex-1 lg:flex">
            <StoreSearchBar value={searchValue} onChange={onSearchChange} />
          </div>
        )}

        <div className="site-header-actions store-header__actions">
          <Link to="/projects" className="store-header__lab-link hidden text-xs sm:inline">
            ← Lab site
          </Link>
          <ThemeToggle compact />
          <NavCart />
          <NavAccount />
        </div>
      </div>

      {onSearchChange && (
        <div className="store-header__search-mobile border-t border-dark-border px-3 py-2 lg:hidden">
          <StoreSearchBar value={searchValue} onChange={onSearchChange} />
        </div>
      )}
    </header>
  )
}
