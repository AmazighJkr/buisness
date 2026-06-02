import { Link } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NavAccount from './NavAccount.jsx'
import NavCart from './NavCart.jsx'
import SiteHomeLink from './SiteHomeLink.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { NAV_STORE, navLinkActive } from '../config/siteNav.js'
import { useTranslation } from '../context/LocaleContext.jsx'

/**
 * Store-only header — not mixed with Projects / Subscriptions.
 */
export default function StoreHeader({
  highlight = '/shop',
  headerStart = null,
  searchValue = '',
  onSearchChange = null,
  searchSlot = null,
}) {
  const { t } = useTranslation()
  const isActive = (to) => navLinkActive(highlight, to)
  const search = searchSlot

  return (
    <header className="store-header site-header">
      <div
        className={`store-header__inner site-header-inner${headerStart ? ' site-header-inner--with-leading' : ''}`}
      >
        <div className="site-header-home">
          <SiteHomeLink />
        </div>

        {headerStart ? <div className="site-header-leading">{headerStart}</div> : null}

        <Link to="/shop" className="site-logo store-header__logo">
          Store<span>Grid</span>
        </Link>

        <nav className="store-header__nav" aria-label="Store navigation">
          {NAV_STORE.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={`site-nav-link ${isActive(to) ? 'site-nav-link-active' : ''}`}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        {search ? (
          <div className="store-header__search hidden min-w-0 flex-1 lg:flex">{search}</div>
        ) : null}

        <div className="site-header-actions store-header__actions">
          <LanguageSwitcher compact />
          <ThemeToggle compact />
          <NavCart />
          <NavAccount />
        </div>
      </div>

      {search ? (
        <div className="store-header__search-mobile border-t border-dark-border px-3 py-2 lg:hidden">
          {search}
        </div>
      ) : null}
    </header>
  )
}
