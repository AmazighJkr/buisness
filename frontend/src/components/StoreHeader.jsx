import { Link } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import MainSiteButton from './MainSiteButton.jsx'
import NavAccount from './NavAccount.jsx'
import NavCart from './NavCart.jsx'
import SiteSubheader from './SiteSubheader.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { NAV_STORE, navLinkActive } from '../config/siteNav.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function StoreHeader({ highlight = '/shop', subheader = null }) {
  const { t } = useTranslation()
  const isActive = (to) => navLinkActive(highlight, to)

  return (
    <header className="store-header site-header">
      <div className="store-header__inner site-header-inner lab-header__inner">
        <MainSiteButton />

        <Link to="/shop" className="site-logo store-header__logo site-header-brand">
          Embedded<span>Grid</span>
        </Link>

        <nav className="store-header__nav site-nav-desktop" aria-label="Store navigation">
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

        <div className="site-header-actions store-header__actions">
          <LanguageSwitcher compact />
          <ThemeToggle compact />
          <NavCart />
          <NavAccount />
        </div>
      </div>
      <SiteSubheader>{subheader}</SiteSubheader>
    </header>
  )
}
