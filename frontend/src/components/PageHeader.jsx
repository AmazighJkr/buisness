import { Link } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NavAccount from './NavAccount.jsx'
import SiteHomeLink from './SiteHomeLink.jsx'
import { SiteNavDesktop, SiteNavMobile, SiteNavProvider } from './SiteNav.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function PageHeader({
  highlight = '',
  headerStart = null,
  beforeLogo = null,
  searchSlot = null,
}) {
  const { t } = useTranslation()
  const leading = headerStart ?? beforeLogo

  return (
    <SiteNavProvider highlight={highlight}>
      <header className="site-header lab-header">
        <div
          className={`site-header-inner lab-header__inner${leading ? ' site-header-inner--with-leading' : ''}${searchSlot ? ' lab-header__inner--with-search' : ''}`}
        >
          <div className="site-header-home">
            <SiteHomeLink />
          </div>

          {leading ? <div className="site-header-leading">{leading}</div> : null}

          <Link to="/projects" className="site-logo site-header-brand">
            Embedded<span>Grid</span>
          </Link>

          {searchSlot ? <div className="lab-header__search">{searchSlot}</div> : null}

          <SiteNavDesktop />

          <div className="site-header-actions">
            <Link to="/shop" className="store-entry-btn hidden sm:inline-flex">
              {t('nav.store')}
            </Link>
            <LanguageSwitcher compact />
            <ThemeToggle compact />
            <NavAccount />
            <SiteNavMobile />
          </div>
        </div>
        {searchSlot ? (
          <div className="lab-header__search-mobile border-t border-dark-border px-3 py-2 lg:hidden">
            {searchSlot}
          </div>
        ) : null}
      </header>
    </SiteNavProvider>
  )
}
